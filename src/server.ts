import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express, { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { config } from './app/app.config.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.html');

const app = express();

const commonEngine = new CommonEngine();

app.set('view engine', 'html');
app.set('views', browserDistFolder);

app.get('*.*', express.static(browserDistFolder, {
  maxAge: '1y'
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('x-powered-by');
  next();
});

app.get('*', (req: Request, res: Response) => {
  res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
});

const port = process.env['PORT'] || 4200;
app.listen(port, (error?: Error) => {
  if (error) throw error;
  console.log(`Node Express server listening on http://localhost:${port}`);
});
