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
    UNSAFE_componentWillReceiveProps(nextProps) {
        if (nextProps.highlighted !== this.props.highlighted) {
            this.safeForceUpdate();
        }
    }
    UNSAFE_componentWillMount() {
        if (super.UNSAFE_componentWillMount) {
            super.UNSAFE_componentWillMount();
        }

        this.nodeProps?.use(this.changeListener);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.nodeProps?.unuse(this.changeListener);
    }
}
