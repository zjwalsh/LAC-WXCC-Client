import { useState, useEffect, useRef, useCallback } from 'react';

// SDK will be loaded dynamically when available
let Desktop = null;

export default function App(props) {
  // ============================================
  // WEBEX SDK STATE
  // ============================================
  const [taskId, setTaskId] = useState(null);
  const [taskInfo, setTaskInfo] = useState({});
  const [agentInfo, setAgentInfo] = useState(null);
  const [sdkActive, setSdkActive] = useState(false);
  const [sdkError, setSdkError] = useState(null);

  // ============================================
  // FORM STATE
  // ============================================
  const [processType, setProcessType] = useState('');
  const [formData, setFormData] = useState({
    program_cdf: 'CalFresh',
    appnum_cdf: '',
    fname_cdf: '',
    lname_cdf: '',
    appdate_cdf: '',
    casenum_cdf: ''
  });
  const [errors, setErrors] = useState({});
  const [recording, setRecording] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Initialize from props if host injected them
  useEffect(() => {
    console.log('[App] props on mount:', props);
    if (props) {
      if (props.taskId) {
        setTaskId(props.taskId);
        setSdkActive(true);
        console.log('[App] Initialized taskId from props:', props.taskId);
      }
      if (props.store) {
        // try to extract agent/task info if present
        const s = props.store;
        const sTask = s?.agentContact?.selectedTaskId ?? s?.taskId;
        if (sTask && !props.taskId) {
          setTaskId(sTask);
          setSdkActive(true);
          console.log('[App] Initialized taskId from props.store:', sTask);
        }
        if (s?.agent) setAgentInfo(s.agent);
      }
    }
  }, [props]);

  // ============================================
  // MESSAGE LISTENER - Receives task updates from parent
  // ============================================
  useEffect(() => {
    const messageHandler = (event) => {
      try {
        const data = event && event.data;
        console.log('[React App] Received message from parent:', data && data.type);
        if (!data) return;

        if (data.type === 'TASK_DATA') {
          const { taskId: incomingTaskId, taskInfo: incomingTaskInfo, agentInfo: incomingAgentInfo } = data.payload || {};
          if (incomingTaskId) {
            setTaskId(incomingTaskId);
            setTaskInfo(incomingTaskInfo || {});
            setAgentInfo(incomingAgentInfo || null);
            setSdkActive(true);
            setSdkError(null);
            console.log('[React App] ✅ Task ID received:', incomingTaskId);
          }
        }
      } catch (err) {
        console.warn('[React App] messageHandler error', err);
      }
    };

    window.addEventListener('message', messageHandler);
    console.log('[React App] Message listener attached');

    // also listen for custom store-ready events
    const storeReadyHandler = (e) => {
      console.log('[React App] store-ready event:', e?.detail);
    };
    window.addEventListener('store-ready', storeReadyHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
      window.removeEventListener('store-ready', storeReadyHandler);
    };
  }, []);

  // ============================================
  // FORM FUNCTIONS
  // ============================================

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!processType) {
      newErrors.process = 'Please select a process type';
    }

    if (!formData.program_cdf) {
      newErrors.program_cdf = 'Program is required';
    }

    if (!formData.appnum_cdf) {
      newErrors.appnum_cdf = 'Application Number is required';
    } else if (processType === 'YBN') {
      if (!formData.appnum_cdf.match(/^LRS.{7,}/)) {
        newErrors.appnum_cdf = 'Must start with LRS + 7 chars';
      }
    } else if (processType === 'LRS') {
      if (formData.appnum_cdf.length < 8) {
        newErrors.appnum_cdf = 'Must be at least 8 digits';
      }
    }

    if (!formData.fname_cdf) {
      newErrors.fname_cdf = 'First Name is required';
    }

    if (!formData.lname_cdf) {
      newErrors.lname_cdf = 'Last Name is required';
    }

    if (processType === 'LRS' && !formData.casenum_cdf) {
      newErrors.casenum_cdf = 'Case Number is required for LRS';
    } else if (processType === 'LRS' && !formData.casenum_cdf.match(/^LRS.{7,}/)) {
      newErrors.casenum_cdf = 'Must start with LRS + 7 chars';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartRecording = async () => {
    if (!validateForm()) {
      showAlert('error', 'Please fix form errors');
      return;
    }

    if (!taskId) {
      showAlert('error', 'No active call detected. Please ensure a call is active.');
      return;
    }

    try {
      const metadata = {
        taskId: taskId,
        agentInfo: agentInfo,
        process: processType,
        program: formData.program_cdf,
        appNumber: formData.appnum_cdf,
        firstName: formData.fname_cdf,
        lastName: formData.lname_cdf,
        appDate: formData.appdate_cdf,
        caseNumber: formData.casenum_cdf,
        timestamp: new Date().toISOString()
      };

      console.log('Sending metadata:', metadata);

      const response = await fetch('http://localhost:8443/telephonic-signature/pauseResume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata })
      });

      const result = await response.json();

      if (result.success) {
        setRecording(true);
        showAlert('success', 'Recording started successfully');
      } else {
        showAlert('error', result.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Network error. Please try again.');
    }
  };

  const handleStopRecording = async (disconnected = false) => {
    const reason = disconnected ? 'disconnected' : 'manual';

    try {
      const response = await fetch('http://localhost:8443/telephonic-signature/pauseResume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metadata: {
            taskId: taskId,
            reason: reason,
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setRecording(false);
        const msg = disconnected ? 'Recording stopped - Call disconnected' : 'Recording stopped';
        showAlert('info', msg);
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('error', 'Failed to stop recording');
    }
  };

  const handleClearForm = () => {
    setProcessType('');
    setFormData({
      program_cdf: 'CalFresh',
      appnum_cdf: '',
      fname_cdf: '',
      lname_cdf: '',
      appdate_cdf: '',
      casenum_cdf: ''
    });
    setRecording(false);
    setErrors({});
    showAlert('info', 'Form cleared');
  };

  const handleProcessTypeChange = (value) => {
    setProcessType(value);
    if (value === 'YBN') {
      setFormData(prev => ({ ...prev, appnum_cdf: 'LRS', casenum_cdf: '' }));
    } else if (value === 'LRS') {
      setFormData(prev => ({ ...prev, appnum_cdf: '', casenum_cdf: 'LRS' }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isCaseMandatory = processType === 'LRS';
  const appPlaceholder = processType === 'YBN' ? 'LRS0123456' : 'Application Number';

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ height: '100%', display: 'flex', boxSizing: 'border-box', padding: 24, background: 'var(--bg, #f8fafc)', width: '100%' }}>
      <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: 32, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
        {/* Debug and SDK status banners removed for production */}

        {/* Active Call Info */}
        {taskId && (
          <div className="mb-4 p-3 rounded bg-blue-100 text-blue-800 text-sm">
            <strong>✓ Active Call:</strong> <code className="bg-blue-200 px-2 py-1 rounded text-xs">{taskId}</code>
            {agentInfo && (
              <div className="mt-2 text-xs">
                <span>Agent: {agentInfo.name || agentInfo.id || 'Unknown'}</span>
              </div>
            )}
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Telephonic Signature Metadata
        </h2>

        {alert.show && (
          <div className={`p-4 mb-6 rounded ${
            alert.type === 'success' ? 'bg-green-100 text-green-800' :
            alert.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {alert.message}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Was Application processed on *
          </label>
          <select
            value={processType}
            onChange={(e) => handleProcessTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Process</option>
            <option value="LRS">LRS E-Application</option>
            <option value="YBN">YBN</option>
          </select>
          {errors.process && (
            <span className="text-red-600 text-sm mt-1">{errors.process}</span>
          )}
        </div>

        {processType && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Program *
              </label>
              <select
                value={formData.program_cdf}
                onChange={(e) => handleInputChange('program_cdf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CalFresh">CalFresh</option>
                <option value="CalWORKs">CalWORKs</option>
                <option value="Medi-Cal">Medi-Cal</option>
                <option value="General Relief Cash Aid">General Relief Cash Aid</option>
                <option value="General Relief SPP-14">General Relief SPP-14</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Number *
              </label>
              <input
                type="text"
                value={formData.appnum_cdf}
                onChange={(e) => handleInputChange('appnum_cdf', e.target.value)}
                placeholder={appPlaceholder}
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.appnum_cdf && (
                <span className="text-red-600 text-sm mt-1 block">{errors.appnum_cdf}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.fname_cdf}
                onChange={(e) => handleInputChange('fname_cdf', e.target.value)}
                placeholder="First Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fname_cdf && (
                <span className="text-red-600 text-sm mt-1 block">{errors.fname_cdf}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lname_cdf}
                onChange={(e) => handleInputChange('lname_cdf', e.target.value)}
                placeholder="Last Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.lname_cdf && (
                <span className="text-red-600 text-sm mt-1 block">{errors.lname_cdf}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Date
              </label>
              <input
                type="date"
                value={formData.appdate_cdf}
                onChange={(e) => handleInputChange('appdate_cdf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Number{isCaseMandatory ? ' *' : ''}
              </label>
              <input
                type="text"
                value={formData.casenum_cdf}
                onChange={(e) => handleInputChange('casenum_cdf', e.target.value)}
                placeholder={isCaseMandatory ? 'LRS0123456 (Mandatory)' : 'If available'}
                maxLength={isCaseMandatory ? 10 : 7}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.casenum_cdf && (
                <span className="text-red-600 text-sm mt-1 block">{errors.casenum_cdf}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleClearForm}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
          >
            Clear Form
          </button>

          <button
            onClick={handleStartRecording}
            disabled={!processType || recording || !taskId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            title={!taskId ? 'Waiting for active call from Webex' : 'Start Recording'}
          >
            Start Recording
          </button>

          {recording && (
            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium animate-pulse">
              ● Recording Active
            </span>
          )}

          <button
            onClick={() => handleStopRecording(false)}
            disabled={!recording}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            Stop Recording
          </button>

          <button
            onClick={() => handleStopRecording(true)}
            disabled={!recording}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            Call Disconnected
          </button>
        </div>
      </div>
    </div>
  );
}