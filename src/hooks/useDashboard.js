import { useState, useCallback } from 'react';

export const useDashboard = () => {
  const [missionsReport, setMissionsReport] = useState([]);
  const [driverActivity, setDriverActivity] = useState([]);
  const [fuelReport, setFuelReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMissionsReport = useCallback(async (params) => {
    setLoading(true);
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dashboard/missions-report${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMissionsReport(Array.isArray(data) ? data : data?.content || []);
    } catch {
      setMissionsReport([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDriverActivity = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dashboard/driver-activity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDriverActivity(Array.isArray(data) ? data : data?.content || []);
    } catch {
      setDriverActivity([]);
    }
  }, []);

  const fetchFuelReport = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dashboard/fuel-report', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFuelReport(data);
    } catch {
      setFuelReport(null);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dashboard/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAlerts(data);
    } catch {
      setAlerts(null);
    }
  }, []);

  return {
    missionsReport,
    driverActivity,
    fuelReport,
    stats,
    alerts,
    loading,
    fetchMissionsReport,
    fetchDriverActivity,
    fetchFuelReport,
    fetchStats,
    fetchAlerts,
  };
};

export default useDashboard;