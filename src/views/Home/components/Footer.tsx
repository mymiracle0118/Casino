import Pixarts from '../../../assets/pixelwork/pixarts.png';

function Footer() {
  return (
    <footer>
        <div className="container">
            <div className="row">
                <div className="col-lg-6">
                    <div className="copyright">
                        &copy; 2021 <span className="text-important">InvokersNFT.com</span> All rights reserved.
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="author">
                        Design &amp; Animation by <a href="https://pixarts.net/"><img src={Pixarts} alt="Pixarts.net - Game Design &amp; Animation" /></a>
                    </div>
                </div>
            </div>
        </div>
    </footer>
  )
}

export default Footer
