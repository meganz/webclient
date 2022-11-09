import {MegaRenderMixin} from "../../../../chat/mixins";
import {NodeProperties} from "./nodeProperties";

export class GenericNodePropsComponent extends MegaRenderMixin {
    constructor(props) {
        super(props);
        if (this.props.node.h) {
            this.nodeProps = NodeProperties.get(this.props.node);

            this.changeListener = this.changeListener.bind(this);
        }
    }
    changeListener() {
        if (this.isMounted()) {
            this.safeForceUpdate();
        }
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.highlighted !== this.props.highlighted) {
            this.safeForceUpdate();
        }
    }
    componentWillMount() {
        if (super.componentWillMount) {
            super.componentWillMount();
        }

        this.nodeProps?.use(this.changeListener);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.nodeProps?.unuse(this.changeListener);
    }
}
