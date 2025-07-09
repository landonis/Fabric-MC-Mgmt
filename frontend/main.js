import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="container">
    <h1>Login</h1>
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button id="login">Login</button>
    <div id="message"></div>
  </div>
`

document.querySelector('#login').addEventListener('click', async () => {
  const username = document.querySelector('#username').value
  const password = document.querySelector('#password').value
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  const result = await response.json()
  if (response.ok) {
    document.querySelector('#message').textContent = '✅ Login successful'
  } else {
    document.querySelector('#message').textContent = '❌ ' + result.error
  }
})
