import {expect, test} from '@oclif/test';

describe(`scrape`, () => {
  test
  .stdout()
  .command([`scrape`])
  .it(`runs hello`, ctx => {
    expect(ctx.stdout).to.contain(`hello world`);
  });

  test
  .stdout()
  .command([`scrape`, `--name`, `jeff`])
  .it(`runs hello --name jeff`, ctx => {
    expect(ctx.stdout).to.contain(`hello jeff`);
  });
});
