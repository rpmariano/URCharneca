self.addEventListener('push', function (event) {
  let data = {
    title: 'U.R. Charneca Atletismo',
    body: 'Tens um novo aviso da Armada Azul.',
    url: '/'
  }
  if (event.data) {
    try {
      data = Object.assign(data, event.data.json())
    } catch {
      data.body = event.data.text()
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
