import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import './ConfirmModal.css';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

interface ConfirmProviderProps {
    children: ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleClose = (result: boolean) => {
        setIsOpen(false);
        if (resolveRef.current) {
            resolveRef.current(result);
            resolveRef.current = null;
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <div className="confirm-modal-overlay" onClick={() => handleClose(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        {options.title && <div className="confirm-modal-title">{options.title}</div>}
                        <div className="confirm-modal-message">{options.message}</div>
                        <div className="confirm-modal-actions">
                            <button
                                className="confirm-modal-btn confirm-modal-cancel"
                                onClick={() => handleClose(false)}
                            >
                                {options.cancelText || 'Cancelar'}
                            </button>
                            <button
                                className={`confirm-modal-btn confirm-modal-confirm ${options.isDanger ? 'danger' : ''}`}
                                onClick={() => handleClose(true)}
                                autoFocus
                            >
                                {options.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
