import fs from 'fs';
import path from 'path';

export function isLegacyFrontendPath(pathname) {
  return pathname === '/index.html'
    || pathname === '/js'
    || pathname.startsWith('/js/')
    || pathname === '/css'
    || pathname.startsWith('/css/');
}

export function createFrontendDelivery({ rootDir, staticFactory }) {
  const webDistDir = path.join(rootDir, 'web/dist');
  const webDistIndex = path.join(webDistDir, 'index.html');
  const hasModernFrontend = fs.existsSync(webDistIndex);

  return {
    mode: hasModernFrontend ? 'react-dist' : 'react-dist-missing',
    mount(app) {
      if (hasModernFrontend) {
        app.use(staticFactory(webDistDir));
      }
      app.use('/assets', staticFactory(path.join(rootDir, 'assets')));
    },
    sendIndex(res) {
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.sendFile(webDistIndex);
    },
  };
}
