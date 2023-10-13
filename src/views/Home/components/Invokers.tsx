import LogoInvokersText from '../../../assets/pixelwork/logo-text.png';

function Invokers() {
  return (
    <section className="invokers" id="invokers">
        <div className="container">
            <div className="row">
                <div className="col-xl-12">
                    <a href=""><img src={LogoInvokersText} className="logo-footer" alt="Invokers" /></a>
                    <div className="description">
                        <span className="text-white">InvokersCasino</span> Double your $IV and SOL by playing Tavern Coin Toss, Beat the house in Blackjack, Spin the wheel to Earn and more coming soon.
                    </div>
                </div>
            </div>
        </div>
    </section>
  )
}

export default Invokers
