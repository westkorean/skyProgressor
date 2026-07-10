const Navbar = () => {
    return (
        <nav className="navbar">
            <h1>skyProgressor</h1>
            <div className="links">
                <a href="/" style={{
                    color: "white",
                    backgroundColor: "#f1356d",
                    borderRadius: "8px"
                }}>Home</a>
                
                <a href="/create" style={{
                    color: "white",
                    backgroundColor: "#f1356d",
                    borderRadius: "8px"
                }}>Create</a>
            </div>
        </nav>
    );
}
 
export default Navbar;