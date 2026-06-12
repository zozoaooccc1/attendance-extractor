import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    AsyncStorage.getItem(EMPLOYEE_KEY).then(v => {
      if (v) {
        try {
          const data = JSON.parse(v);
          if (data.employeeName) setName(data.employeeName);
          if (data.department) setDept(data.department);
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((patch: object) => {
    AsyncStorage.getItem(EMPLOYEE_KEY).then(v => {
      const cur = v ? JSON.parse(v) : {};
      AsyncStorage.setItem(EMPLOYEE_KEY, JSON.stringify({ ...cur, ...patch }));
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
