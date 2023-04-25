/**
 * stringToDate
 * @param string
 * @returns {*}
 * [...] TODO: add documentation
 */

export const stringToDate = string => {
    const formats = [
        'DD MMM YYYY',
        'DD-MM-YYYY',
        'DD.MM.YYYY',
        'MMM DD YYYY',
        'YYYY MMM DD',
        'YYYY DD MMM',
    ];

    return moment(string, formats);
};

/**
 * stringToTime
 * @param string
 * @returns {*}
 * [...] TODO: add documentation
 */

export const stringToTime = string => moment(string, ['HH:mm', 'hh:mm A']);

/**
 * isSameDay
 * @param {number} a
 * @param {number} b
 * @return {boolean} Boolean indicating whether the passed timestamps are the same day
 */

export const isSameDay = (a, b) => {
    return new Date(a).toDateString() === new Date(b).toDateString();
};

/**
 * isToday
 * @param {number} timestamp Timestamp
 * @return {boolean}
 */

export const isToday = timestamp => {
    return new Date(timestamp).toDateString() === new Date().toDateString();
};

/**
 * isTomorrow
 * @param {number} timestamp
 * @return {boolean}
 */

export const isTomorrow = timestamp => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toDateString() === new Date(timestamp).toDateString();
};

/**
 * getDaysInMonth
 * @param {number} year
 * @param {number} month
 * @return {number}
 */

export const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
};

/**
 * addMonths
 * @param {number} timestamp
 * @param {number} months
 * @return {number}
 */

export const addMonths = (timestamp, months) => {
    const date = new Date(timestamp);
    return new Date(date.setMonth(date.getMonth() + months)).getTime();
};

/**
 * getNearestHalfHour
 * @description Returns timestamp in milliseconds of the nearest half hour based on the passed timestamp.
 * @param {number} timestamp Timestamp
 * @return {number} Timestamp in milliseconds rounded to the next near half hour
 */

export const getNearestHalfHour = (timestamp = Date.now()) => {
    const { SCHEDULED_MEETINGS_INTERVAL } = ChatRoom;
    return new Date(Math.ceil(timestamp / SCHEDULED_MEETINGS_INTERVAL) * SCHEDULED_MEETINGS_INTERVAL).getTime();
};

export const getUserTimezone = () => {
    // [...] fallback?
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * getTimeIntervals
 * @description Returns time intervals for the given timestamp, incl. optionally duration string for each
 * generated interval based on passed offset timestamp.
 *
 * ex.:
 * const now = offset = Date.now();
 * time2date(now / 1000) -> `10/28/2022, 14:38`
 *
 *  getFilteredTimeIntervals(now, offset)
 * [
 *     {value: 1666958411784, label: '15:00', duration: 1440000},
 *     {value: 1666960211784, label: '15:30', duration: 3240000},
 *     {value: 1666962023055, label: '16:00', duration: 4980000},
 *     {value: 1666963823055, label: '16:30', duration: 6780000}
 *     ...
 * ]
 *
 * @param {number} timestamp Timestamp to generate intervals based on
 * @param {number} [offsetFrom] Timestamp used as offset to generate duration strings
 * @param {number} [interval] The interval in minutes
 * @see getTimeIntervals
 * @return [{ value: number, label: string, duration: number }] Filtered time intervals
 */

export const getTimeIntervals = (timestamp, offsetFrom, interval = 30) => {
    const increments = [];
    if (timestamp) {
        const [targetDate, initialDate] = [new Date(timestamp), new Date(timestamp)].map(date => {
            date.setHours(0);
            date.setMinutes(0);
            return date;
        });

        while (targetDate.getDate() === initialDate.getDate()) {
            const timestamp = targetDate.getTime();
            // `duration` is set only if `offsetFrom` is passed *and* both dates are the same day
            const diff = offsetFrom && isSameDay(timestamp, offsetFrom) && timestamp - offsetFrom;
            increments.push({
                value: timestamp,
                label: toLocaleTime(timestamp),
                duration: diff && diff > 0 ? diff : undefined
            });
            targetDate.setMinutes(targetDate.getMinutes() + interval);
        }
    }
    return increments;
};
