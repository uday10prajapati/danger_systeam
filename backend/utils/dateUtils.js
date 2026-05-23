// Backend utilities for IST date handling
export const toISTDateInput = (input = new Date()) => {
  const d = new Date(input);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

export const formatToIST = (input = new Date(), opts = {}) => {
  const d = new Date(input);
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(d);
};

export const nowIST = () => new Date(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' }).format());
