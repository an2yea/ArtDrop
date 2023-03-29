export default async function handler (req, res){
    const payload = JSON.stringify({
        input: req.body,
        version: 'db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
      });
      
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.NEXT_PUBLIC_REPLICATE_PVT_KEY}`,
          "Content-Type": "application/json",
        },
        body: payload,
      });
      console.log("response is", response.status)
    
      if (response.status !== 201) {
        let error = await response.json();
        res.statusCode = 500;
        res.end(JSON.stringify({ detail: error.detail }));
        return;
      }
    
      const prediction = await response.json();
      res.statusCode = 201;
      res.end(JSON.stringify(prediction));
}