import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI
from pydantic import BaseModel

try:
    import validators
except Exception:
    validators = None

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:
    SentenceTransformer = None
    cosine_similarity = None

try:
    import spacy
except Exception as exc:  # pragma: no cover
    raise RuntimeError("spaCy must be installed") from exc

app = FastAPI(title="Track Unity NLP Service", version="1.0.0")

SKILLS_PATH = Path(__file__).resolve().parent / "skills_db.json"
with SKILLS_PATH.open("r", encoding="utf-8") as f:
    SKILLS_DB = json.load(f)

try:
    NER_MODEL = spacy.load("en_core_web_sm")
except Exception:
    NER_MODEL = spacy.blank("en")

if SentenceTransformer is not None:
    EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
else:
    EMBEDDING_MODEL = None

TITLE_HINTS = {
    "Internship": ["intern", "internship", "summer internship"],
    "Hackathon": ["hackathon", "buildathon"],
    "Fellowship": ["fellowship", "fellow"],
    "Scholarship": ["scholarship", "grant"],
}


class ExtractRequest(BaseModel):
    text: str


class RecommendRequest(BaseModel):
    userProfile: Dict[str, Any]
    opportunity: Dict[str, Any]


def remove_emojis(text: str) -> str:
    return re.sub(r"[\U00010000-\U0010ffff]", "", text)


def normalize_urls(text: str) -> str:
    def _norm(match: re.Match) -> str:
        url = match.group(0)
        if is_valid_url(url):
            return url.strip().rstrip(".,)")
        return url

    return re.sub(r"https?://[^\s]+", _norm, text)


def is_valid_url(url: str) -> bool:
    if not url:
        return False

    if validators is not None:
        return bool(validators.url(url))

    return bool(re.match(r"^https?://[\w.-]+(?:\.[\w.-]+)+[/#?]?.*$", url))


def clean_text(text: str) -> str:
    without_emojis = remove_emojis(text or "")
    normalized = normalize_urls(without_emojis)
    return re.sub(r"\s+", " ", normalized).strip()


def extract_entities(text: str) -> Tuple[Optional[str], Optional[str]]:
    doc = NER_MODEL(text)
    company = None
    deadline_text = None

    for ent in doc.ents:
        if ent.label_ == "ORG" and not company:
            company = ent.text.strip()
        if ent.label_ == "DATE" and not deadline_text:
            deadline_text = ent.text.strip()

    return company, deadline_text


def extract_regex_items(text: str) -> Dict[str, List[str]]:
    links = re.findall(r"https?://[^\s,]+", text)
    emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    phones = re.findall(r"(?:\+\d{1,3}[\s-]?)?(?:\d[\s-]?){10,12}", text)
    return {
        "links": links,
        "emails": emails,
        "phones": [p.strip() for p in phones],
    }


def extract_skills(text: str) -> List[str]:
    lowered = text.lower()
    found = []
    for skill in SKILLS_DB:
        skill_token = str(skill).strip().lower()
        if not skill_token:
            continue

        escaped = re.escape(skill_token)
        pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"

        if re.search(pattern, lowered):
            found.append(skill)
    return sorted(set(found))


def detect_opportunity_type(text: str) -> str:
    lowered = text.lower()
    for label, hints in TITLE_HINTS.items():
        if any(hint in lowered for hint in hints):
            return label
    return "Opportunity"


def detect_title(text: str, company: Optional[str], opportunity_type: str) -> str:
    base = company or "General"

    if re.search(r"\bhiring\s+challenge\b", text, flags=re.IGNORECASE):
        return f"{base} Hiring Challenge".strip()

    if re.search(r"\bfresher\s+hiring\b", text, flags=re.IGNORECASE):
        return f"{base} Fresher Hiring".strip()

    title_match = re.search(
        r"([A-Z][A-Za-z0-9&.,'\- ]+?)\s+(internship|hackathon|fellowship|scholarship)",
        text,
        flags=re.IGNORECASE,
    )
    if title_match:
        return " ".join(part.capitalize() for part in title_match.group(0).split())
    if opportunity_type != "Opportunity":
        return f"{base} {opportunity_type}".strip()
    return f"{base} Opportunity".strip()


def normalize_deadline(raw_date: Optional[str], text: str) -> Optional[str]:
    candidates = []

    # Prefer explicit registration/apply deadlines over other dates in the post.
    high_priority_patterns = [
        r"(?:last date(?:\s+to\s+register)?|register by|apply by|deadline)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?|[A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})",
    ]
    for pattern in high_priority_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            candidates.append(match.group(1))

    if raw_date:
        candidates.append(raw_date)

    regex_candidate = re.search(
        r"(?:deadline|last date(?:\s+to\s+register)?|apply by|closes? on|register by)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?|[A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})",
        text,
        flags=re.IGNORECASE,
    )
    if regex_candidate:
        candidates.append(regex_candidate.group(1))

    formats = [
        "%Y-%m-%d",
        "%d %B %Y",
        "%d %b %Y",
        "%d %B",
        "%d %b",
        "%B %d, %Y",
        "%B %d",
        "%b %d, %Y",
        "%b %d",
        "%d/%m/%Y",
        "%d/%m/%y",
        "%m/%d/%Y",
        "%m/%d/%y",
    ]

    for candidate in candidates:
        cleaned = re.sub(r"(st|nd|rd|th)", "", candidate, flags=re.IGNORECASE).strip()
        for date_format in formats:
            try:
                parsed = datetime.strptime(cleaned, date_format)
                if "%Y" not in date_format:
                    parsed = parsed.replace(year=datetime.utcnow().year)
                return parsed.strftime("%Y-%m-%d")
            except ValueError:
                continue

    return None


def infer_role(text: str, detected_type: str) -> str:
    detailed_role_match = re.search(
        r"(?:role|position)\s*[:\-]\s*(.+?)(?=\s+(?:experience|qualification|salary|location|challenge|selection process|apply here)\b|$)",
        text,
        flags=re.IGNORECASE,
    )
    if detailed_role_match:
        return re.sub(r"\s+", " ", detailed_role_match.group(1)).strip(" -:")

    role_match = re.search(
        r"\b(internship|intern|engineer|developer|analyst|researcher|fellow|scholar)\b",
        text,
        flags=re.IGNORECASE,
    )
    if role_match:
        role = role_match.group(1).lower()
        if role == "intern":
            return "Internship"
        return role.capitalize()
    return detected_type


def extract_eligibility(text: str) -> Optional[str]:
    qualification_match = re.search(
        r"(?:qualification|qualifications?)\s*[:\-]\s*(.+?)(?=\s+(?:experience|salary|location|selection process|apply here|last date|deadline|challenge start|register by|join)\b|$)",
        text,
        flags=re.IGNORECASE,
    )
    if qualification_match:
        return re.sub(r"\s+", " ", qualification_match.group(1)).strip(" -:")

    experience_match = re.search(
        r"(?:experience)\s*[:\-]\s*([0-9]+\s*[–\-]\s*[0-9]+\s*years?)",
        text,
        flags=re.IGNORECASE,
    )
    if experience_match:
        return experience_match.group(1).strip()

    eligibility_patterns = [
        r"(?:eligible|eligibility|open to|for)\s*[:\-]?\s*([^.!\n]+)",
        r"(\d(?:st|nd|rd|th)\s+year\s+students?)",
    ]
    for pattern in eligibility_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def pick_best_link(links: List[str]) -> Optional[str]:
    for link in links:
        normalized = link.strip().rstrip('.,)')
        if is_valid_url(normalized):
            return normalized
    return None


def extract_company_from_text(text: str, fallback_company: Optional[str]) -> Optional[str]:
    stop_tokens = {
        "fresher", "hiring", "opportunity", "resume", "shortlisting", "through", "challenge",
        "no", "urgent", "walkin", "walk-in",
    }

    sentence_hiring_match = re.search(
        r"(?:^|[.!?]\s+)([A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,3})\s+is\s+hiring\b",
        text,
    )
    if sentence_hiring_match:
        candidate = sentence_hiring_match.group(1).strip()
        words = [word for word in candidate.split() if word.lower() not in stop_tokens]
        if words:
            return " ".join(words[-2:]) if len(words) > 2 else " ".join(words)

    hiring_match = re.search(r"\b([A-Z][A-Za-z0-9&.\-]*)\s+is\s+hiring\b", text)
    if hiring_match:
        return hiring_match.group(1).strip()

    at_match = re.search(r"\b(?:hiring|opportunity)\s+(?:at|with)\s+([A-Z][A-Za-z0-9&.\- ]{1,60})\b", text, flags=re.IGNORECASE)
    if at_match:
        return at_match.group(1).strip()

    return fallback_company


def infer_domain(text: str, role: Optional[str], skills: List[str]) -> Optional[str]:
    lowered = text.lower()
    role_text = (role or "").lower()
    combined = " ".join([lowered, role_text, " ".join(skills).lower()])

    if any(token in combined for token in ["java", "software engineer", "developer", "coding", "backend", "frontend"]):
        return "Software Engineering"
    if any(token in combined for token in ["machine learning", "deep learning", "ai", "nlp", "data science"]):
        return "AI/ML"
    if any(token in combined for token in ["security", "cyber", "penetration", "vulnerability"]):
        return "Cybersecurity"

    return None


def confidence_score(
    title: str,
    company: Optional[str],
    deadline: Optional[str],
    link: Optional[str],
    skills: List[str],
) -> float:
    score = 0.2
    if title and title != "General Opportunity":
        score += 0.2
    if company:
        score += 0.2
    if deadline:
        score += 0.15
    if link:
        score += 0.15
    if skills:
        score += min(0.1, len(skills) * 0.02)
    return round(min(score, 0.99), 2)


def html_to_text(content: str) -> str:
    if BeautifulSoup is None:
        return re.sub(r"<[^>]+>", " ", content)

    soup = BeautifulSoup(content, "html.parser")
    return soup.get_text(" ", strip=True)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/extract")
def extract(req: ExtractRequest) -> Dict[str, Any]:
    cleaned = clean_text(req.text)
    company, ent_date = extract_entities(cleaned)
    regex_items = extract_regex_items(cleaned)

    if "<html" in cleaned.lower():
        cleaned = html_to_text(cleaned)

    company = extract_company_from_text(cleaned, company)
    opportunity_type = detect_opportunity_type(cleaned)
    title = detect_title(cleaned, company, opportunity_type)
    deadline = normalize_deadline(ent_date, cleaned)
    skills = extract_skills(cleaned)
    role = infer_role(cleaned, opportunity_type)
    domain = infer_domain(cleaned, role, skills)
    link = pick_best_link(regex_items["links"])

    result = {
        "title": title,
        "company": company or "Unknown Company",
        "role": role,
        "domain": domain,
        "deadline": deadline,
        "eligibility": extract_eligibility(cleaned),
        "skills": skills,
        "applicationLink": link,
        "description": cleaned,
        "confidenceScore": confidence_score(title, company, deadline, link, skills),
    }

    return result


@app.post("/recommend-match")
def recommend_match(req: RecommendRequest) -> Dict[str, Any]:
    user_skills = [str(skill).strip() for skill in req.userProfile.get("skills", []) if skill]
    opportunity_skills = [str(skill).strip() for skill in req.opportunity.get("skills", []) if skill]

    user_skill_set = {s.lower() for s in user_skills}
    opportunity_skill_set = {s.lower() for s in opportunity_skills}

    matched_skills = [s for s in opportunity_skills if s.lower() in user_skill_set]
    missing_skills = [s for s in opportunity_skills if s.lower() not in user_skill_set]

    user_text = " ".join(
        [
            req.userProfile.get("careerDomain", ""),
            req.userProfile.get("preferredRole", ""),
            " ".join(user_skills),
        ]
    ).strip()

    opp_text = " ".join(
        [
            req.opportunity.get("eligibility", ""),
            req.opportunity.get("description", ""),
            " ".join(opportunity_skills),
        ]
    ).strip()

    if EMBEDDING_MODEL is not None and cosine_similarity is not None and user_text and opp_text:
        embeddings = EMBEDDING_MODEL.encode([user_text, opp_text])
        similarity = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
        similarity = round(max(0.0, min(1.0, similarity)), 2)
    else:
        user_tokens = {token.lower() for token in re.findall(r"[a-zA-Z0-9+#.]+", user_text)}
        opp_tokens = {token.lower() for token in re.findall(r"[a-zA-Z0-9+#.]+", opp_text)}
        if user_tokens and opp_tokens:
            overlap = len(user_tokens.intersection(opp_tokens))
            union = len(user_tokens.union(opp_tokens))
            similarity = round(overlap / union, 2) if union else 0.0
        else:
            similarity = 0.0

    eligible = len(matched_skills) > 0 and similarity >= 0.35

    return {
        "eligible": eligible,
        "matchedSkills": matched_skills,
        "missingSkills": missing_skills,
        "similarityScore": similarity,
    }
