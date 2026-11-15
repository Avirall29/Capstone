import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError, TOKEN_KEY, APPLICANT_KEY } from './api';
import { stopBackgroundTracking, setActiveTrip, clearQueue } from './tracking';
import { getPushToken } from './notifications';

const AuthContext = createContext(null);
const USER_KEY = 'driverUser';

/**
 * status: loading | signedOut | applicant | driver
 * An applicant has registered (or tried to sign in) but isn't approved yet.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, application: null });

  useEffect(() => {
    (async () => {
      const [token, applicant, user] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(APPLICANT_KEY), AsyncStorage.getItem(USER_KEY)
      ]);
      if (token) setState({ status: 'driver', user: JSON.parse(user || 'null'), application: null });
      else if (applicant) setState({ status: 'applicant', user: null, application: null });
      else setState({ status: 'signedOut', user: null, application: null });
    })();
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/driver/login', { email, password }, { token: null });
      await AsyncStorage.multiSet([[TOKEN_KEY, res.token], [USER_KEY, JSON.stringify(res.user)]]);
      await AsyncStorage.removeItem(APPLICANT_KEY);
      setState({ status: 'driver', user: res.user, application: null });
      getPushToken().then((token) => token && api.post('/auth/driver/push-token', { token }).catch(() => {}));
    } catch (error) {
      const code = error?.data?.code;
      if (error instanceof ApiError && (code === 'APPLICATION_PENDING' || code === 'APPLICATION_REJECTED')) {
        await AsyncStorage.setItem(APPLICANT_KEY, error.data.applicationToken);
        setState({ status: 'applicant', user: null, application: error.data.application });
        return;
      }
      throw error;
    }
  }, []);

  const register = useCallback(async (payload) => {
    const pushToken = await getPushToken();
    const res = await api.post('/auth/driver/register', { ...payload, ...(pushToken && { pushToken }) }, { token: null, timeoutMs: 120000 });
    await AsyncStorage.setItem(APPLICANT_KEY, res.applicationToken);
    setState({ status: 'applicant', user: null, application: res.application });
  }, []);

  const signOut = useCallback(async () => {
    await stopBackgroundTracking();
    await setActiveTrip(null);
    await clearQueue();
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, APPLICANT_KEY]);
    setState({ status: 'signedOut', user: null, application: null });
  }, []);

  const value = useMemo(() => ({ ...state, signIn, register, signOut }), [state, signIn, register, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
