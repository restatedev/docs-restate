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
        <div className={`tabs tabs tab-container ${className}`}>
            <ul className="not-prose mb-6 pb-[1px] flex-none min-w-full overflow-auto border-b border-gray-200 gap-x-6 flex dark:border-gray-200/10" data-component-part="tabs-list">
                {tabs.map((tab, index) => (
                    <li key={index} className="cursor-pointer">
                        <button
                            className={index === activeTab 
                                ? "flex text-sm items-center gap-1.5 leading-6 font-semibold whitespace-nowrap pt-3 pb-2.5 -mb-px max-w-max border-b text-primary dark:text-primary-light border-current"
                                : "flex text-sm items-center gap-1.5 leading-6 font-semibold whitespace-nowrap pt-3 pb-2.5 -mb-px max-w-max border-b text-gray-900 border-transparent hover:border-gray-300 dark:text-gray-200 dark:hover:border-gray-700"
                            }
                            data-component-part="tab-button"
                            data-active={index === activeTab}
                            onClick={() => handleTabClick(index)}
                        >
                            {tab.props.title}
                        </button>
                    </li>
                ))}
            </ul>
            <div className="prose dark:prose-dark overflow-x-auto" data-component-part="tab-content">
                {tabs[activeTab]?.props.children}
            </div>
        </div>
    )
}

export const GlobalTab = ({ title, children }) => {
    return <div>{children}</div>
}

export const HiddenGlobalTab = ({ title, children }) => {

}
