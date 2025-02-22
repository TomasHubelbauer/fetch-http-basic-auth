import Bun from 'bun';
import index from './index.html';
import { USER_NAME, PASSWORD } from './secrets.ts';

Bun.serve({
  static: {
    '/': index
  },
  fetch(request) {
    // Note that the URL never contains the username and password because the
    // browser transforms them into the `Authorization` header even if they are
    // provided directly in the browser address bar
    const url = new URL(request.url);

    if (url.pathname === '/api/data') {
      const authorization = request.headers.get('Authorization');
      if (!authorization || !authorization.startsWith('Basic ')) {
        return new Response(null, {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic'
          }
        });
      }
  
      const base64 = authorization.slice('Basic '.length);
      const [userName, password] = Buffer.from(base64, 'base64').toString().split(':');
      if (userName !== USER_NAME || password !== PASSWORD) {
        return new Response(null, {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic'
          }
        });
      }
  
      return Response.json({ userName });
    }

    return new Response(null, { status: 404 });
  }
});
