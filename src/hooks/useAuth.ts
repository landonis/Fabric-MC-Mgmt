import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        navigate('/login');
      }
    };
    check();
  }, [navigate]);
}
