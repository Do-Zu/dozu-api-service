// Helper functions for naming conventions
const toPascalCase = str => {
  return str
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .split(/\s+/) // Split by spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

const toKebabCase = str => {
  return str
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .split(/\s+/) // Split by spaces
    .join('-')
    .toLowerCase();
};

const toCamelCase = str => {
  return str
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .split(/\s+/) // Split by spaces
    .map((word, index) => {
      // First word starts with lowercase, others with uppercase
      return index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
};

const isValidNameService = serviceName => {
  return /^[a-zA-Z\s]+$/.test(serviceName);
};

module.exports = {
  toPascalCase,
  toKebabCase,
  toCamelCase,
  isValidNameService,
};
