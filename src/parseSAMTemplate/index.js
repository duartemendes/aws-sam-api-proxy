import { yamlParse } from 'yaml-cfn';

export default async (templateYaml) => yamlParse(templateYaml);
