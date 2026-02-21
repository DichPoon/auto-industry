import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ProtocolType, Device } from '../types';

const protocolOptions: { value: ProtocolType; label: string }[] = [
  { value: 'mqtt', label: 'MQTT' },
  { value: 'modbus', label: 'Modbus TCP' },
  { value: 'opcua', label: 'OPC UA' },
  { value: 's7', label: 'Siemens S7' },
];

export function DeviceConfigModal() {
  const { isConfigModalOpen, editingDevice, closeConfigModal, addDevice, updateDevice } =
    useStore();

  const [formData, setFormData] = useState({
    name: '',
    protocol: 'mqtt' as ProtocolType,
    enabled: true,
    config: {} as Record<string, unknown>,
  });

  // Populate form when editing
  useEffect(() => {
    if (editingDevice) {
      setFormData({
        name: editingDevice.name,
        protocol: editingDevice.protocol,
        enabled: editingDevice.enabled,
        config: editingDevice.config,
      });
    } else {
      setFormData({
        name: '',
        protocol: 'mqtt',
        enabled: true,
        config: {},
      });
    }
  }, [editingDevice, isConfigModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDevice) {
      updateDevice(editingDevice.id, formData);
    } else {
      addDevice(formData);
    }

    closeConfigModal();
  };

  const updateConfig = (key: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  };

  return (
    <AnimatePresence>
      {isConfigModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeConfigModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-industrial-700">
                <h2 className="text-lg font-display font-semibold text-white">
                  {editingDevice ? 'Edit Device' : 'Add New Device'}
                </h2>
                <button
                  onClick={closeConfigModal}
                  className="p-1 rounded hover:bg-industrial-700 transition-colors"
                >
                  <X className="w-5 h-5 text-industrial-400" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Device Name */}
                <div>
                  <label className="block text-sm font-mono text-industrial-400 mb-1">
                    Device Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="My Device"
                    required
                    className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                  />
                </div>

                {/* Protocol */}
                <div>
                  <label className="block text-sm font-mono text-industrial-400 mb-1">
                    Protocol
                  </label>
                  <select
                    value={formData.protocol}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        protocol: e.target.value as ProtocolType,
                        config: {},
                      }))
                    }
                    className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                  >
                    {protocolOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Protocol-specific config */}
                {formData.protocol === 'mqtt' && (
                  <>
                    <div>
                      <label className="block text-sm font-mono text-industrial-400 mb-1">
                        Broker URL
                      </label>
                      <input
                        type="text"
                        value={(formData.config.broker as string) || ''}
                        onChange={(e) => updateConfig('broker', e.target.value)}
                        placeholder="mqtt://localhost"
                        required
                        className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-mono text-industrial-400 mb-1">
                        Port
                      </label>
                      <input
                        type="number"
                        value={(formData.config.port as number) || 1883}
                        onChange={(e) => updateConfig('port', parseInt(e.target.value))}
                        required
                        className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                      />
                    </div>
                  </>
                )}

                {formData.protocol === 'modbus' && (
                  <>
                    <div>
                      <label className="block text-sm font-mono text-industrial-400 mb-1">
                        Host
                      </label>
                      <input
                        type="text"
                        value={(formData.config.host as string) || ''}
                        onChange={(e) => updateConfig('host', e.target.value)}
                        placeholder="192.168.1.100"
                        required
                        className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-mono text-industrial-400 mb-1">
                          Port
                        </label>
                        <input
                          type="number"
                          value={(formData.config.port as number) || 502}
                          onChange={(e) => updateConfig('port', parseInt(e.target.value))}
                          required
                          className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-mono text-industrial-400 mb-1">
                          Unit ID
                        </label>
                        <input
                          type="number"
                          value={(formData.config.unitId as number) || 1}
                          onChange={(e) => updateConfig('unitId', parseInt(e.target.value))}
                          required
                          className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                {formData.protocol === 'opcua' && (
                  <div>
                    <label className="block text-sm font-mono text-industrial-400 mb-1">
                      Endpoint
                    </label>
                    <input
                      type="text"
                      value={(formData.config.endpoint as string) || ''}
                      onChange={(e) => updateConfig('endpoint', e.target.value)}
                      placeholder="opc.tcp://localhost:4840"
                      required
                      className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                    />
                  </div>
                )}

                {formData.protocol === 's7' && (
                  <>
                    <div>
                      <label className="block text-sm font-mono text-industrial-400 mb-1">
                        Host
                      </label>
                      <input
                        type="text"
                        value={(formData.config.host as string) || ''}
                        onChange={(e) => updateConfig('host', e.target.value)}
                        placeholder="192.168.1.100"
                        required
                        className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-mono text-industrial-400 mb-1">
                          Port
                        </label>
                        <input
                          type="number"
                          value={(formData.config.port as number) || 102}
                          onChange={(e) => updateConfig('port', parseInt(e.target.value))}
                          required
                          className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-mono text-industrial-400 mb-1">
                          Rack
                        </label>
                        <input
                          type="number"
                          value={(formData.config.rack as number) || 0}
                          onChange={(e) => updateConfig('rack', parseInt(e.target.value))}
                          required
                          className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-mono text-industrial-400 mb-1">
                          Slot
                        </label>
                        <input
                          type="number"
                          value={(formData.config.slot as number) || 1}
                          onChange={(e) => updateConfig('slot', parseInt(e.target.value))}
                          required
                          className="w-full bg-industrial-800 border border-industrial-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Enabled Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-industrial-600 bg-industrial-800 text-cyan focus:ring-cyan focus:ring-offset-0"
                  />
                  <label htmlFor="enabled" className="text-sm font-mono text-industrial-300">
                    Enable device
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeConfigModal}
                    className="flex-1 py-2 px-4 rounded-lg border border-industrial-600 text-industrial-300 font-mono hover:bg-industrial-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 rounded-lg bg-cyan/20 text-cyan font-mono hover:bg-cyan/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {editingDevice ? 'Update' : 'Add Device'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
