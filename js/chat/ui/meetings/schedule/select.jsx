import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';
import { PerfectScrollbar } from '../../../../ui/perfectScrollbar.jsx';

export default class Select extends MegaRenderMixin {
    static NAMESPACE = 'meetings-select';

    containerRef = React.createRef();
    menuRef = React.createRef();
    optionRefs = {};

    state = {
        expanded: false
    };

    getFormattedDuration(duration) {
        duration = moment.duration(duration);
        const hours = duration.get('hours');
        const minutes = duration.get('minutes');
        if (!hours && !minutes) {
            return '';
        }
        if (!hours && minutes) {
            return l.time_offset_om;
        }
        return (minutes ? l.time_offset_wm : l.time_offset_wh).replace('%d', hours);
    }

    handleMousedown = ({ target }) =>
        this.containerRef?.current.contains(target) ? null : this.setState({ expanded: false });

    componentWillUnmount() {
        super.componentWillUnmount();
        document.removeEventListener('mousedown', this.handleMousedown);
    }

    componentDidMount() {
        super.componentDidMount();
        document.addEventListener('mousedown', this.handleMousedown);
    }

    render() {
        const { NAMESPACE } = Select;
        const { name, className, icon, options, value, format, onSelect } = this.props;

        return (
            <div
                ref={this.containerRef}
                className={`
                    ${NAMESPACE}
                    ${className || ''}
                `}
                onClick={() => {
                    this.setState(state => ({ expanded: !state.expanded }), () => {
                        if (value && this.optionRefs[value]) {
                            this.menuRef.current.scrollToElement(this.optionRefs[value]);
                        }
                    });
                }}>
                <input
                    type="text"
                    className={`
                        ${NAMESPACE}-input
                        ${name}
                    `}
                    value={value}
                    onChange={() => false}
                />
                <div className="mega-input dropdown-input">
                    {value && <span>{format ? format(value) : value}</span>}
                    {icon && <i className="sprite-fm-mono icon-dropdown"/>}
                    {options && (
                        <div
                            className={`
                                mega-input-dropdown
                                ${this.state.expanded ? '' : 'hidden'}
                            `}>
                            <PerfectScrollbar
                                ref={this.menuRef}
                                options={{ suppressScrollX: true }}>
                                {options.map(option => {
                                    return (
                                        <div
                                            ref={ref => {
                                                this.optionRefs[option.value] = ref;
                                            }}
                                            key={option.value}
                                            className={`
                                                option
                                                ${option.value === value || option.label === value ? 'active' : ''}
                                            `}
                                            onClick={() => onSelect(option)}>
                                            {option.label}
                                            &nbsp;
                                            {option.duration && this.getFormattedDuration(option.duration)}
                                        </div>
                                    );
                                })}
                            </PerfectScrollbar>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
