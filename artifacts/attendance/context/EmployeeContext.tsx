import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMPLOYEE_KEY = 'attendance_employee_v1';

interface EmployeeContextType {
  employeeName: string;
  setEmployeeName: (name: string) => void;
  department: string;
  setDepartment: (dept: string) => void;
}

const EmployeeContext = createContext<EmployeeContextType | null>(null);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employeeName, setName] = useState('');
  const [department, setDept] = useState('');
  const persistQueue = useRef(Promise.resolve());

  useEffect(() => {
    AsyncStorage.getItem(EMPLOYEE_KEY).then(v => {
      if (v) {
        try {
          const data = JSON.parse(v);
          if (data.employeeName) setName(data.employeeName);
          if (data.department) setDept(data.department);
        } catch (e) {
          console.warn('[EmployeeContext] Failed to parse stored data:', e);
        }
      }
    }).catch(e => {
      console.warn('[EmployeeContext] Failed to load stored data:', e);
    });
  }, []);

  /**
   * persist متسلسل: كل كتابة تنتظر انتهاء الكتابة السابقة
   * لمنع حالة السباق عند استدعاء setEmployeeName و setDepartment بسرعة.
   */
  const persist = useCallback((patch: object) => {
    persistQueue.current = persistQueue.current
      .then(() => AsyncStorage.getItem(EMPLOYEE_KEY))
      .then(v => {
        const cur = v ? JSON.parse(v) : {};
        return AsyncStorage.setItem(EMPLOYEE_KEY, JSON.stringify({ ...cur, ...patch }));
      })
      .catch(e => {
        console.warn('[EmployeeContext] Persist error:', e);
      });
  }, []);

  const setEmployeeName = useCallback((name: string) => {
    setName(name);
    persist({ employeeName: name });
  }, [persist]);

  const setDepartment = useCallback((dept: string) => {
    setDept(dept);
    persist({ department: dept });
  }, [persist]);

  return (
    <EmployeeContext.Provider value={{ employeeName, setEmployeeName, department, setDepartment }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error('useEmployee must be used inside EmployeeProvider');
  return ctx;
}
