import path from 'path';
import parseSAMTemplate from '../../src/parseSAMTemplate';

describe('parseSAMTemplate()', () => {
  it('should parse a SAM template successfully', async () => {
    const templatePath = path.join(__dirname, '../fixtures/template.yaml');

    const template = await parseSAMTemplate(templatePath);

    expect(template.Description).toEqual('Resources API');
    expect(template.Resources).toBeDefined();
  });
});
