import React from 'react';
import { MegaRenderMixin } from '../../../stores/mixins';
import Result from './result.jsx';
import { LABELS } from './gifPanel.jsx';

export const HAS_INTERSECTION_OBSERVER = typeof IntersectionObserver !== 'undefined';
export const NODE_CONTAINER_CLASS = 'node-container';
export const NODE_CLASS = 'node';
const RESULT_CONTAINER_CLASS = 'gif-panel-results';
const RESULTS_END_CLASS = 'results-end';

const Nil = ({ children }) => (
    <div className="no-results-container">
        <div className="no-results-content">
            <i className="huge-icon sad-smile"/>
            <span>{children}</span>
        </div>
    </div>
);

export default class ResultContainer extends MegaRenderMixin {
    intersectionObserver = null;

    constructor(props) {
        super(props);
    }

    initializeIntersectionObserver = () => {
        if (HAS_INTERSECTION_OBSERVER) {
            this.intersectionObserver = new IntersectionObserver(
                entries => {
                    for (let i = 0; i < entries.length; i++) {
                        const entry = entries[i];
                        const target = entry.target;

                        // Load images when within viewport, else offload
                        if (target.classList?.contains(NODE_CLASS)) {
                            target.style.backgroundImage = entry.isIntersecting ? `url(${target.dataset.url})` : null;
                        }

                        // Reached results bottom -> invoke pagination request
                        if (entry.isIntersecting && target.classList?.contains(RESULTS_END_CLASS)) {
                            this.props.onPaginate();
                        }
                    }
                }
            );
        }
    };

    toggleIntersectionObserver = (node, action = 'observe') => {
        if (node && this.intersectionObserver) {
            this.intersectionObserver[action](node);
        }
    };

    componentDidMount() {
        super.componentDidMount();
        this.initializeIntersectionObserver();
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
    }

    componentWillReceiveProps(nextProps) {
        super.componentWillReceiveProps(nextProps);

        if (nextProps !== this.props) {
            this.safeForceUpdate();
        }
    }

    render() {
        const { loading, results, bottom, unavailable, onClick } = this.props;

        if (unavailable) {
            return <Nil>{LABELS.NOT_AVAILABLE}</Nil>;
        }

        if (loading && results.length < 1) {
            return (
                <div className={RESULT_CONTAINER_CLASS}>
                    {Array.from({ length: 25 }, (element, index) =>
                        <div key={index} className={NODE_CONTAINER_CLASS}>
                            <div className={NODE_CLASS} style={{ height: Math.floor(Math.random() * 150) + 100 }} />
                        </div>
                    )}
                </div>
            );
        }

        if (!loading && results.length < 1) {
            return <Nil>{LABELS.NO_RESULTS}</Nil>;
        }

        if (results.length) {
            return (
                <>
                    <div className={RESULT_CONTAINER_CLASS}>
                        {results.map(({ slug, images: { fixed_width_downsampled }, title }, index) => {
                            return (
                                <Result
                                    key={`${slug}--${index}`}
                                    image={fixed_width_downsampled}
                                    title={title}
                                    onClick={() => onClick(results[index])}
                                    onMount={this.toggleIntersectionObserver}
                                    onUnmount={this.toggleIntersectionObserver}
                                />
                            );
                        })}
                    </div>
                    <div
                        className={RESULTS_END_CLASS}
                        ref={node => this.toggleIntersectionObserver(node)}
                        style={{
                            visibility: bottom ? 'visible' : 'hidden'
                        }}>
                        <img
                            className="emoji"
                            alt="\ud83d\ude10"
                            src={`${staticpath}/images/mega/twemojis/2_v2/72x72/1f610.png`} />
                        <strong>{LABELS.END_OF_RESULTS}</strong>
                    </div>
                </>
            );
        }

        return null;
    }
}
