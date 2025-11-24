// Admin route that loads the admin dashboard in an iframe
// This displays the admin dashboard from port 3001 under the /admin route
export default function AdminRoute() {
  // Get the current path and remove /admin prefix
  const adminPath = window.location.pathname.replace('/admin', '') || '/';
  const adminUrl = `http://localhost:3001${adminPath}${window.location.search}${window.location.hash}`;

  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <iframe
        src={adminUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        title="Admin Dashboard"
      />
    </div>
  );
}

