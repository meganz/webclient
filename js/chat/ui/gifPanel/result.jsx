import React from 'react';
import { HAS_INTERSECTION_OBSERVER, NODE_CLASS, NODE_CONTAINER_CLASS } from './resultContainer.jsx';

export default class Result extends React.Component {
    resultRef = React.createRef();

    componentDidMount() {
        this.props.onMount?.(this.resultRef.current);
    }

    componentWillUnmount() {
        this.props.onUnmount?.(this.resultRef.current, 'unobserve');
    }

    render() {
        const { image, title, onClick } = this.props;

        return (
            <div
                className={`
                    ${NODE_CONTAINER_CLASS}
                    ${onClick ? 'clickable' : ''}
                `}
                style={{ height: parseInt(image.height) }}>
                <div
                    ref={this.resultRef}
                    className={NODE_CLASS}
                    style={{ backgroundImage: HAS_INTERSECTION_OBSERVER ? '' : `url(${image.url})`, }}
                    data-url={image.url}
                    onClick={onClick}>
                    <span>{title}</span>
                </div>
            </div>
        );
    }
}
