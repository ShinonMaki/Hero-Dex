function formatFileLabel(text) {
  return text
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = {
  formatFileLabel
};
