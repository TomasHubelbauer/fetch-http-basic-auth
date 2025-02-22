# `fetch` HTTP basic auth endpoint

What happens when using `fetch` with the HTTP basic auth utilizing endpoint?
Will the browser prompt for the credentials interactively and unblock the call
once the user provides them or is it possible to provide the credentials in the
HTTP request headers and have the request go through unattended?

## How to run

`bun --hot .`

## Conclusion

The `Authorization` response header can be prepared with the challenge response
containing the correct credentials in which case the `fetch` call can be made
unattended meaning there is no interactive prompt presented to the user by the
browser.

In case the credentials are not provided, the `fetch` will wait for the user to
fill in the correct credentials and then the `fetch` will complete, meaning the
prompt can be presented via code, not just by redirecting to an endpoint that
implements HTTP basic auth.

## Building blocks

### How HTTP basic authentication scheme works: an example implementation

https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication

1. Client hits the server
2. Server responds with a 401 and `WWW-Authenticate` response challenge header
3. Browser prompts the user for credentials (or auto-completes them)
4. Client hits the server with `Authorization` request credential header
5. Server validates the credentials and processes further

```typescript
import Bun from 'bun';

// Note that this is hard-coded for demonstration purposes only
const USER_NAME = 'tom';
const PASSWORD = '1234';

Bun.serve({
  fetch(request) {
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

    return new Response();
  }
});
```

When responding with a 200, Firefox will ask the user to remember the credential
in case both user name and password were provided.

### How to reset HTTP basic auth auto-completion in Firefox

There is no straightforward way to do this in modern Firefox versions.

What won't work:

- History > Clear Recent History affects more than HTTP basic auth credentials
- Hitting `anything@localhost:3000` replaces the credentials instead of clearing
- The Web Developer extension has a feature for this but is not built-in
- Using a private window is a workaround not a way to reset the credentials
- The Passwords settings page in Firefox does not contain HTTP basic auth stuff
  unless both user name and password were provided and the user used the prompt
  Firefox shows asking whether or not to remember the credentials
  (so there is a difference between session credentials and stored credentials)

There are closed Firefox bugs dealing with this:

- https://bugzilla.mozilla.org/show_bug.cgi?id=540516
  UI for HTTP basic auth password reset
- https://bugzilla.mozilla.org/show_bug.cgi?id=521588
  Redesign of the HTTP basic auth flow

Since both are closed and HTTP basic auth is not a popular auth mechanism these
days, it is highly unlikely anything will ever change on this front.

As a workaround, I decided to special-case the sitation where the user name or
the password is used.
I will return a 401 causing the browser to prompt for a new set of credentials,
effectively resetting the prior ones thus marked as invalid.

HTTP URLs can contain HTTP basic auth credentials as a part of them like so:
http://userName:password@localhost:3000

Providing the credentials in the URL directly is a fast way of entering them
without having to go through the credential dialog.

In terms of the HTTP basic auth flow, this skips the first few steps and goes
directly to the client hitting the server with the `Authorization` header with
the challenge solution.

The `:password` part is optional, which is useful when the user name is not a
real user name, but a one-time token or similar.
When left out, the challenge solution will contain an empty password.

By making use of this, we can add a special branch for when the user name or the
password are empty and return a 401.
In practice, since password can be left out and the user name can't without
defaulting back to the stored credentials, this will always get triggered by
leaving out the password and providing just the user name.
Since this empty user name or password check will come before the credential
check, we can provide any user name and an empty password to cause the reset.
I go for the `@` as the user name since it is fast to type:

http://@@localhost:3000

Note that we can't use `@localhost:3000` or `:@localhost:3000` to provide empty
credentials, because these two situations result in the browser sending the
already remembered credentails as a fallback instead.

```typescript
import Bun from 'bun';

Bun.serve({
  fetch(request) {
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
    if (!userName || !password) {
      return new Response(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic'
        }
      });
    }

    return new Response();
  }
});
```

![](prompt.png)

By dismissing this dialog, the browser will clear the remembered credentials and
will prompt the user for credentials again on the next reload.

Since providing an incorrect set of credentials also results in a 401 response,
this branch is potentially redundant.
It can be kept for clarity or it can be left out and the user can be educated to
know providing an intentionally incorrect set of credentials is a way to log out
of the HTTP basic auth scheme.

### What `realm` is for in the `WWW-Authenticate` response header

`realm` is a value that can specify the system the user is logging into.

Browsers used to surface its name in the prompt for credentials, but Firefox at
least has since stopped doing that.

The `realm` information is not repeated back to the server when the credentials
are entered in any way, so as of today it is not useful and can be left out from
the `WWW-Authenticate` response header altogether.

![](prompt.png)


### HTTP basic auth on subdomains, subpaths etc.

HTTP basic auth challenge can be provided under any arbitrary set of URL parts,
be it a subdomain, a subpath or even a combination of search parameters in the
query string.

One exception is the URL fragment which is not exposed to the server and is
browser-side only.

This means a server can have both unathenticated and authenticated routes:

```typescript
import Bun from 'bun';

// Note that this is hard-coded for demonstration purposes only
const USER_NAME = 'tom';
const PASSWORD = '1234';

Bun.serve({
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
```

In this scenario, the `/api/data` route is authenticated and when authorized, it
will return the user information.

Any other route is unathenticated (credential prompt will not be presented by
the browser) and invalid.

### Bun HTTP server static routes and HTML imports

To demonstrate the problem end to end, I am implementing the HTTP basic auth end
in a dynamic route in `Bun.serve`, but I am using Bun's static routes with HTML
imports to serve a site that does the `fetch` call so I do not have to hard-code
it in `Bun.serve` as well.

The static route will take precedence over the dynamic route fallback 404 path.

## How I tested this

I created a Bun server with a dynamic route implementing HTTP basic auth on the
`/api/data` path returning a JSON payload with a 200 response code in case the
correct credentials are provided and 401 in all other cases except for when the
route path itself is invalid in which case it returns a 404.

I also exposed a static route at `/` which serves a basic HTML document with two
demo buttons one of which makes a `fetch` to `/api/data` bare and the other with
the `Authorization` header pre-set to the correct HTTP basic auth challenge
response for the valid credentials.

I called the script that's linked from the HTML `index.tsx` to distinguish it
from the `index.ts` used to implement the server since Bun supports JSX/TSX out
of the box and this extension can be used even if it doesn't contain React code.

Run using `bun --hot .`.

I was able to demonstrate that hitting the endpoint with this pre-prepared
challenge response allows the `fetch` call to succeed and no interactive user
prompt is presented by the browser.
