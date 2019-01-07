import loadingImage from './images/loading.gif';

export default class LoadingSpinner extends React.PureComponent {

    render() {
        const message = this.props.message ? <h3>{this.props.message}</h3> : '';
        return (
            <div className="page-loader">
                {message}
                <img src={loadingImage} width="70px" alt="loading"/>
            </div>
        )
    }
}
