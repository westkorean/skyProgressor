import { useState } from "react";

const Home = () => {
    const [name, setName] = useState("westkorean");
    const [id, setID] = useState(110023923902903);

    const handleClick = () => {
       setName("ThirtyVirus");
       setID(110023923902904);
    }

    return ( 
        <div className="home">
            <h2>Homepage</h2>
            <p>{name}</p>
            <p>{id}</p>
            <button onClick={handleClick}>Get Started</button>
        </div>
     );
}
 
export default Home;