// Custom tab compnent which allows syncing tabs with the same title across different instances

export const GlobalTabs = ({ children, className = '' }) => {
    const [activeTab, setActiveTab] = useState(0)

    const tabs = React.Children.toArray(children).filter(child =>
        child.type && child.type.name === 'GlobalTab'
    )

    useEffect(() => {
        const handleGlobalTabChange = (event) => {
            const targetTitle = event.detail.title
            const matchingIndex = tabs.findIndex(tab => tab.props.title === targetTitle)
            if (matchingIndex !== -1 && matchingIndex !== activeTab) {
                setActiveTab(matchingIndex)
            }
        }

        window.addEventListener('globalTabChange', handleGlobalTabChange)
        return () => window.removeEventListener('globalTabChange', handleGlobalTabChange)
    }, [tabs, activeTab])

    const handleTabClick = (index) => {
        setActiveTab(index)

        // Dispatch global event to sync all tabs with the same title
        const title = tabs[index].props.title
        window.dispatchEvent(new CustomEvent('globalTabChange', {
            detail: { title }
        }))
    }

    return (
        <div className={`simple-tabs ${className}`}>
            <div className="tabs-list" role="tablist" style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        role="tab"
                        aria-selected={index === activeTab}
                        onClick={() => handleTabClick(index)}
                        className={`tab-button ${index === activeTab ? 'active' : ''}`}
                        style={{
                            cursor: 'pointer',
                            padding: '8px 16px',
                            border: 'none',
                            background: 'none',
                            borderBottom: index === activeTab ? '2px solid #3B82F6' : '2px solid transparent',
                            color: index === activeTab ? '#3B82F6' : '#6B7280',
                            fontWeight: index === activeTab ? '600' : '400',
                            fontSize: '14px',
                            marginRight: '24px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab.props.title}
                    </button>
                ))}
            </div>
            <div className="tab-content">
                {tabs[activeTab]?.props.children}
            </div>
        </div>
    )
}

export const GlobalTab = ({ title, children }) => {
    return <div>{children}</div>
}

