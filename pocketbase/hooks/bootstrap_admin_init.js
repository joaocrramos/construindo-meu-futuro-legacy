onBootstrap((e) => {
  e.next()

  try {
    const totalUsers = $app.countRecords('users')
    if (totalUsers > 0) {
      return
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+'
    let password = ''
    const randBytes = $security.randomString(32)
    for (let i = 0; i < 20; i++) {
      const idx = randBytes.charCodeAt(i) % chars.length
      password += chars[idx]
    }
    // Garantir que a senha contenha maiúscula, minúscula, dígito e símbolo
    if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1)
    if (!/[a-z]/.test(password)) password = password.slice(0, 1) + 'a' + password.slice(2)
    if (!/[0-9]/.test(password)) password = password.slice(0, 2) + '9' + password.slice(3)
    if (!/[!@#$%^&*()\-_=+]/.test(password))
      password = password.slice(0, 3) + '!' + password.slice(4)

    const usersCol = $app.findCollectionByNameOrId('users')
    const admin = new Record(usersCol)

    admin.setEmail('admin@construindomeufuturo.com')
    admin.setPassword(password)
    admin.setVerified(true)
    admin.set('role', 'admin')
    admin.set('status', 'active')
    admin.set('must_change_password', true)

    $app.save(admin)

    console.log('INITIAL_ADMIN_CREATED: email=admin@construindomeufuturo.com password=' + password)
  } catch (err) {
    console.log('INITIAL_ADMIN_ERROR: ' + err.message)
  }
})
