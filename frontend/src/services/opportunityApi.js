import API from './api';

export const getOpportunities = async (params = {}) => {
  const res = await API.get('/opportunities', { params });
  return res.data;
};

export const getOpportunityById = async (id) => {
  const res = await API.get(`/opportunities/${id}`);
  return res.data;
};

export const extractOpportunity = async (message) => {
  const res = await API.post('/ingest/text', { message });
  return res.data;
};

export const uploadPosterImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await API.post('/ingest/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const revalidateOpportunityLink = async (id) => {
  const res = await API.patch(`/opportunities/${id}/revalidate-link`);
  return res.data;
};
