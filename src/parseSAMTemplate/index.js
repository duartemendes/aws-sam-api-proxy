import { readFile } from 'fs';
import { promisify } from 'util';
import yaml from 'js-yaml';

const encoding = 'utf-8';
const readFileAsync = promisify(readFile);

const sanitizeTemplate = (templateYaml) => templateYaml.replace(/!/g, '');

export default async (filePath) => {
  const templateYaml = await readFileAsync(filePath, encoding);
  const sanitizedTemplateYaml = sanitizeTemplate(templateYaml);
  return yaml.safeLoad(sanitizedTemplateYaml);
}
