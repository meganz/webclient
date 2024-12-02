import React from 'react';
import { stringToDate } from './helpers.jsx';
import Datepicker from './datepicker.jsx';
import Select from './select.jsx';

export class DateTime extends React.Component {
    state = {
        datepickerRef: undefined,
        manualDateInput: '',
        manualTimeInput: '',
        initialDate: ''
    };

    /**
     * handleChange
     * @param ev
     * [...] TODO: add documentation
     *
     */

    handleChange = ev => {
        const { onChange } = this.props;
        const { datepickerRef, initialDate } = this.state;

        if (!datepickerRef) {
            return;
        }

        const { value } = ev.target;
        const date = stringToDate(value);
        const timestamp = date.valueOf();
        const dateObj = new Date(timestamp);
        dateObj.setHours(initialDate.getHours(), initialDate.getMinutes());

        datepickerRef.selectedDates = [dateObj];
        datepickerRef.currentDate = dateObj;
        datepickerRef.nav._render();
        datepickerRef.views.days._render();

        onChange?.(value);
        this.setState({ manualDateInput: dateObj.getTime() });
    };

    render() {
        const {
            name,
            startDate,
            altField,
            value,
            minDate,
            filteredTimeIntervals,
            label,
            isLoading,
            onMount,
            onSelectDate,
            onSelectTime,
            onBlur
        } = this.props;

        return (
            <>
                {label && <span>{label}</span>}
                <Datepicker
                    name={`${Datepicker.NAMESPACE}-${name}`}
                    className={isLoading ? 'disabled' : ''}
                    isLoading={isLoading}
                    startDate={startDate}
                    altField={`${Select.NAMESPACE}-${altField}`}
                    value={value}
                    minDate={minDate}
                    onMount={datepickerRef => this.setState({ datepickerRef }, () => onMount(datepickerRef))}
                    onSelect={onSelectDate}
                    onFocus={({ target }) => {
                        this.setState(
                            { manualDateInput: undefined, manualTimeInput: undefined, initialDate: new Date(value) },
                            () => target.select()
                        );
                    }}
                    onChange={this.handleChange}
                    onBlur={() => onBlur(this.state.manualDateInput)}
                />
                <Select
                    name={`${Select.NAMESPACE}-${altField}`}
                    className={isLoading ? 'disabled' : ''}
                    isLoading={isLoading}
                    typeable
                    options={filteredTimeIntervals}
                    value={(() => typeof value === 'number' ? value : this.state.datepickerRef.currentDate.getTime())()}
                    format={toLocaleTime}
                    onSelect={onSelectTime}
                    onChange={() => false /* TODO: invoke `onSelectTime` from here for immediate dropdown updates */}
                    onBlur={timestamp => {
                        if (timestamp) {
                            onSelectTime({ value: timestamp });
                        }
                    }}
                />
            </>
        );
    }
}
