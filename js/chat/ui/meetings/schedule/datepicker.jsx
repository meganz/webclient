import React from 'react';
import { MegaRenderMixin } from '../../../mixins.js';

export default class Datepicker extends MegaRenderMixin {
    static NAMESPACE = 'meetings-datepicker';

    OPTIONS = {
        classes: 'meetings-datepicker-calendar',
        dateFormat: '@',
        minDate: null,
        startDate: null,
        selectedDates: [],
        prevHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
        nextHtml: '<i class="sprite-fm-mono icon-arrow-right"></i>',
        altField: null,
        firstDay: 0,
        autoClose: true,
        toggleSelected: false,
        position: 'bottom left',
        language: {
            daysMin: [
                // Sun - Sat
                l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]
            ],
            months: [
                l[408], l[409], l[410], l[411], l[412], l[413], // January - June
                l[414], l[415], l[416], l[417], l[418], l[419]  // July - December
            ],
            monthsShort: [
                l[24035], l[24037], l[24036], l[24038], l[24047], l[24039], // January - June
                l[24040], l[24041], l[24042], l[24043], l[24044], l[24045]  // July - December
            ]
        },
        onSelect: dateText => {
            const prevDate = new Date(+this.props.value);
            const nextDate = new Date(+dateText);
            nextDate.setHours(prevDate.getHours(), prevDate.getMinutes());
            return this.props.onSelect(nextDate.getTime());
        }
    };

    containerRef = React.createRef();
    inputRef = React.createRef();
    datepicker = null;

    constructor(props) {
        super(props);
        this.OPTIONS.startDate = new Date(this.props.startDate);
        this.OPTIONS.selectedDates = this.props.selectedDates || [this.OPTIONS.startDate];
        this.OPTIONS.minDate = this.props.minDate ? new Date(this.props.minDate) : new Date();
        this.OPTIONS.position = this.props.position || this.OPTIONS.position;
        this.OPTIONS.altField = `input.${this.props.altField}`;
    }

    formatValue = value => {
        if (typeof value === 'number') {
            return time2date(value / 1000, 18);
        }
        return value;
    };

    initialize() {
        const inputRef = this.inputRef && this.inputRef.current;
        if (inputRef) {
            $(inputRef).datepicker(this.OPTIONS);
            this.datepicker = $(inputRef).data('datepicker');
            this.props.onMount?.(this.datepicker);
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.containerRef && this.containerRef.current) {
            $(this.containerRef.current).unbind(`keyup.${Datepicker.NAMESPACE}`);
        }
    }

    componentDidMount() {
        super.componentDidMount();
        M.require('datepicker_js').done(() => this.initialize());

        if (this.containerRef && this.containerRef.current) {
            $(this.containerRef.current).rebind(`keyup.${Datepicker.NAMESPACE}`, ({ keyCode }) => {
                if (keyCode === 13 /* RET */) {
                    this.datepicker.hide();
                    return false;
                }
            });
        }
    }

    render() {
        const { NAMESPACE } = Datepicker;
        const { value, name, className, placeholder, onFocus, onChange, onBlur } = this.props;
        const formattedValue = this.formatValue(value);

        return (
            <div
                ref={this.containerRef}
                className={NAMESPACE}>
                <div className="mega-input datepicker-input">
                    <input
                        ref={this.inputRef}
                        type="text"
                        name={name}
                        className={`
                            dialog-input
                            ${className || ''}
                        `}
                        autoComplete="off"
                        placeholder={placeholder || ''}
                        value={formattedValue}
                        onFocus={ev => onFocus?.(ev)}
                        onChange={ev => onChange?.(ev)}
                        onBlur={ev => onBlur?.(ev)}
                    />
                    <i
                        className="sprite-fm-mono icon-calendar1"
                        onClick={() => this.datepicker && this.datepicker.show()}
                    />
                </div>
            </div>
        );
    }
}
