import { useState, useEffect } from 'react';

export interface Role {
    id: string;
    name: string;
    systemPrompt: string;
}

interface RolesManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onRolesChanged: () => void; // Trigger refresh in parent
}

const API_BASE = '';

export function RolesManager({ isOpen, onClose, onRolesChanged }: RolesManagerProps) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadRoles();
        }
    }, [isOpen]);

    const loadRoles = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/roles`);
            if (response.ok) {
                const data = await response.json();
                setRoles(data);
            }
        } catch (error) {
            console.error('Failed to load roles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRole = async () => {
        if (!newName.trim() || !newPrompt.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/api/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName.trim(),
                    systemPrompt: newPrompt.trim()
                }),
            });

            if (response.ok) {
                setNewName('');
                setNewPrompt('');
                setIsAdding(false);
                loadRoles();
                onRolesChanged();
            }
        } catch (error) {
            console.error('Failed to add role:', error);
        }
    };

    const handleDeleteRole = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the role "${name}"?`)) return;

        try {
            const response = await fetch(`${API_BASE}/api/roles/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                loadRoles();
                onRolesChanged();
            }
        } catch (error) {
            console.error('Failed to delete role:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-secondary)] rounded-xl w-full max-w-2xl border border-[var(--border)] shadow-xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Manage Roles</h3>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="text-center text-[var(--text-secondary)] py-8">Loading roles...</div>
                    ) : (
                        <div className="space-y-4">
                            {roles.map(role => (
                                <div key={role.id} className="bg-[var(--bg-tertiary)] rounded-lg p-4 border border-[var(--border)]">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-[var(--text-primary)]">{role.name}</h4>
                                            <pre className="mt-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded overflow-x-auto font-mono whitespace-pre-wrap">
                                                {role.systemPrompt}
                                            </pre>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteRole(role.id, role.name)}
                                            className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-400/10 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {roles.length === 0 && !isAdding && (
                                <div className="text-center text-[var(--text-secondary)] py-8 border-2 border-dashed border-[var(--border)] rounded-lg">
                                    No roles defined. Create one to get started!
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Add Form */}
                <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                    {isAdding ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Role Name (e.g. Senior Developer)"
                                className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-[var(--accent)] text-sm"
                                autoFocus
                            />
                            <textarea
                                value={newPrompt}
                                onChange={(e) => setNewPrompt(e.target.value)}
                                placeholder="System Prompt (e.g. You are a helpful assistant...)"
                                className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-[var(--accent)] text-sm font-mono resize-y min-h-[100px]"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="text-sm text-[var(--text-secondary)] px-4 py-2 rounded-lg hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddRole}
                                    disabled={!newName.trim() || !newPrompt.trim()}
                                    className="text-sm bg-[var(--accent)] text-[var(--bg-primary)] px-4 py-2 rounded-lg hover:bg-[var(--accent-dim)] transition-colors font-medium disabled:opacity-50"
                                >
                                    Save Role
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-3 border-2 border-dashed border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <span>+</span> Add Custom Role
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
