/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// api.ts has to use module.exports as it's also consumed by DocLint which runs
// on Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('./api');

import { helper } from './helper';
import { Page } from './Page';
import { Puppeteer } from './Puppeteer';

interface InitOptions {
  packageJson: {
    puppeteer: {
      chromium_revision: string;
      firefox_revision: string;
    };
    name: string;
  };
  rootDirectory: string;
}

export const initializePuppeteer = (options: InitOptions): Puppeteer => {
  const { packageJson, rootDirectory } = options;

  for (const className in api) {
    if (typeof api[className] === 'function')
      helper.installAsyncStackHooks(api[className]);
  }

  // Expose alias for deprecated method.
  // @ts-expect-error emulateMedia does not exist error
  Page.prototype.emulateMedia = Page.prototype.emulateMediaType;

  let preferredRevision = packageJson.puppeteer.chromium_revision;
  const isPuppeteerCore = packageJson.name === 'puppeteer-core';
  // puppeteer-core ignores environment variables
  const product = isPuppeteerCore
    ? undefined
    : process.env.PUPPETEER_PRODUCT ||
      process.env.npm_config_puppeteer_product ||
      process.env.npm_package_config_puppeteer_product;
  if (!isPuppeteerCore && product === 'firefox')
    preferredRevision = packageJson.puppeteer.firefox_revision;

  const puppeteer = new Puppeteer(
    rootDirectory,
    preferredRevision,
    isPuppeteerCore,
    product
  );

  // The introspection in `Helper.installAsyncStackHooks` references `Puppeteer._launcher`
  // before the Puppeteer ctor is called, such that an invalid Launcher is selected at import,
  // so we reset it.
  puppeteer._lazyLauncher = undefined;
  return puppeteer;
};
