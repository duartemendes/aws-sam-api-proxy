import path from 'path';
import { readFile } from 'fs';
import { promisify } from 'util';
import parseSAMTemplate from '../../src/parseSAMTemplate';

const readFileAsync = promisify(readFile);

describe('parseSAMTemplate()', () => {
  it('should parse a SAM template successfully', async () => {
    const templatePath = path.join(__dirname, '../fixtures/template.yaml');
    const templateYaml = await readFileAsync(templatePath, 'utf-8');

    const template = await parseSAMTemplate(templateYaml);

    expect(template.Description).toEqual('Resources API');
    expect(template.Resources).toBeDefined();
  });
});
