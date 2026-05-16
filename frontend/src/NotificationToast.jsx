import { Toaster } from 'react-hot-toast';

export function NotificationToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#000000',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
      }}
    />
  );
}

export default NotificationToaster;
