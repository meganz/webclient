import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import { HAS_INTERSECTION_OBSERVER, NODE_CLASS, NODE_CONTAINER_CLASS } from './resultContainer.jsx';

export default class Result extends MegaRenderMixin {
    resultRef = React.createRef();

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        super.componentDidMount();
        this.props.onMount?.(this.resultRef.current);
    }

    componentWillUnmount() {
        super.componentWillUnmount();
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
