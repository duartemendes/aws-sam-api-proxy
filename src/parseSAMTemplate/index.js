import yaml from 'js-yaml';

const sanitizeTemplate = (templateYaml) => templateYaml.replace(/!/g, '');

export default async (templateYaml) => {
  const sanitizedTemplateYaml = sanitizeTemplate(templateYaml);
  return yaml.safeLoad(sanitizedTemplateYaml);
};
