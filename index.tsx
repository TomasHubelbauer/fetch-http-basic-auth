import { USER_NAME, PASSWORD } from './secrets.ts';

const userNameCode = document.querySelector('#userNameCode');
if (!userNameCode) {
  throw new Error('User name `code` not found');
}

userNameCode.textContent = USER_NAME;

const passwordCode = document.querySelector('#passwordCode');
if (!passwordCode) {
  throw new Error('Password `code` not found');
}

passwordCode.textContent = PASSWORD;

const urlCode = document.querySelector('#urlCode');
if (!urlCode) {
  throw new Error('URL `code` not found');
}

const url = new URL(location.href);
url.username = '@';
urlCode.textContent = decodeURIComponent(url.toString());

const demo1Button = document.querySelector('#demo1Button');
if (!demo1Button) {
  throw new Error('Demo 1 `button` not found');
}

demo1Button.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/data');
    document.body.append(
      `${new Date().toISOString()}: ${response.status} ${response.statusText}`,
      document.createElement('br')
    );

    if (response.ok) {
      const data = await response.json();
      document.body.append(
        `${new Date().toISOString()}: ${JSON.stringify(data)}`,
        document.createElement('br')
      );
    }
  }
  catch (error) {
    document.body.append(
      `${new Date().toISOString()}: ${error.message}`,
      document.createElement('br')
    );
  }
});

const demo2Button = document.querySelector('#demo2Button');
if (!demo2Button) {
  throw new Error('Demo 2 `button` not found');
}

demo2Button.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/data', {
      headers: {
        Authorization: `Basic ${btoa(`${USER_NAME}:${PASSWORD}`)}`
      }
    });
    document.body.append(
      `${new Date().toISOString()}: ${response.status} ${response.statusText}`,
      document.createElement('br')
    );

    if (response.ok) {
      const data = await response.json();
      document.body.append(
        `${new Date().toISOString()}: ${JSON.stringify(data)}`,
        document.createElement('br')
      );
    }
  }
  catch (error) {
    document.body.append(
      `${new Date().toISOString()}: ${error.message}`,
      document.createElement('br')
    );
  }
});
