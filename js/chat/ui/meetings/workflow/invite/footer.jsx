import React from 'react';
import { MegaRenderMixin } from '../../../../mixins';
import Button from '../../button.jsx';

export default class Footer extends MegaRenderMixin {
    render() {
        const { selected, onClose, onAdd } = this.props;
        return (
            <footer>
                <div className="footer-container">
                    <Button
                        className="mega-button"
                        onClick={onClose}>
                        {l[82] /* `Cancel` */}
                    </Button>
                    <Button
                        className={`
                            mega-button
                            positive
                            ${selected.length > 0 ? '' : 'disabled'}
                        `}
                        onClick={onAdd}>
                        {l.add /* `Add` */}
                    </Button>
                </div>
            </footer>
        );
    }
}
