import fs from 'fs';
import path from 'path';

export function createFrontendDelivery({ rootDir, staticFactory }) {
  const webDistDir = path.join(rootDir, 'web/dist');
  const webDistIndex = path.join(webDistDir, 'index.html');
  const legacyIndex = path.join(rootDir, 'index.html');
  const hasModernFrontend = fs.existsSync(webDistIndex);

  return {
    mode: hasModernFrontend ? 'react-dist' : 'legacy-spa',
    mount(app) {
      if (hasModernFrontend) {
        app.use(staticFactory(webDistDir));
      }
      app.use('/assets', staticFactory(path.join(rootDir, 'assets')));
      app.use('/css', staticFactory(path.join(rootDir, 'css')));
      app.use('/js', staticFactory(path.join(rootDir, 'js')));
    },
    sendIndex(res) {
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.sendFile(hasModernFrontend ? webDistIndex : legacyIndex);
    },
  };
}
