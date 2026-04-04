"""
External API services for geolocation and city data
"""
import requests
from typing import Optional, Dict
from backend.config.settings import IP_GEOLOCATION_API_KEY, CITY_POPULATION_API_KEY


class ExternalAPIService:
    """Handles external API calls for geolocation and city data"""
    
    def __init__(self):
        self.city_cache = {}
    
    def get_city_data(self, city_name: str) -> Dict[str, float]:
        """
        Fetch city population, latitude, and longitude from API or cache
        
        Args:
            city_name: Name of the city to look up
            
        Returns:
            Dictionary with population, latitude, and longitude
        """
        city_name = city_name.strip()
        print(f"🔍 Looking up city: '{city_name}'")
        
        # Check cache first
        if city_name in self.city_cache:
            print(f"✅ Using cached data for {city_name}")
            return self.city_cache[city_name]
        
        try:
            print(f"🌐 Fetching from City API...")
            response = requests.get(
                f"https://api.api-ninjas.com/v1/city?name={city_name}",
                headers={"X-Api-Key": CITY_POPULATION_API_KEY},
                timeout=5
            )
            
            print(f"City API Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"City API Response: {data}")
                
                if data and len(data) > 0:
                    city_info = data[0]
                    result = {
                        "population": city_info.get("population", 150000),
                        "latitude": city_info.get("latitude", 0),
                        "longitude": city_info.get("longitude", 0)
                    }
                    self.city_cache[city_name] = result
                    print(f"✅ Fetched city data for {city_name}: {result}")
                    return result
                else:
                    print(f"⚠️ No city data in API response")
            else:
                print(f"❌ API returned error: {response.text}")
                
        except Exception as e:
            print(f"❌ Error fetching city data: {str(e)}")
        
        # Default fallback
        print(f"⚠️ Using default values for city: {city_name}")
        default_data = {
            "population": 150000,
            "latitude": 0,
            "longitude": 0
        }
        self.city_cache[city_name] = default_data
        return default_data
    
    def get_ip_geolocation(self, ip_address: Optional[str] = None) -> Optional[Dict]:
        """
        Fetch IP geolocation data with VPN/Proxy detection
        
        Args:
            ip_address: IP address to look up (None for requester's IP)
            
        Returns:
            Dictionary with location data, VPN/proxy flags, or None if failed
        """
        try:
            print(f"🌐 Fetching IP geolocation for: {ip_address}")
            url = f"https://api.ipgeolocation.io/ipgeo?apiKey={IP_GEOLOCATION_API_KEY}"
            if ip_address:
                url += f"&ip={ip_address}"
            
            response = requests.get(url, timeout=5)
            print(f"IP Geolocation API Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ IP Geolocation Response: {data}")
                
                # Detect VPN/Proxy based on ISP and other indicators
                isp = data.get("isp", "").lower()
                is_vpn = any(keyword in isp for keyword in [
                    "vpn", "proxy", "tor", "anonymous", "relay", "hosting"
                ])
                
                result = {
                    "latitude": float(data.get("latitude", 0)),
                    "longitude": float(data.get("longitude", 0)),
                    "country": data.get("country_name", ""),
                    "city": data.get("city", ""),
                    "isp": data.get("isp", ""),
                    "is_vpn": is_vpn,
                    "connection_type": data.get("connection_type", "Unknown")
                }
                
                if is_vpn:
                    print(f"⚠️ VPN/Proxy detected from ISP: {isp}")
                
                return result
            else:
                print(f"❌ IP Geolocation API error: {response.text}")
                
        except Exception as e:
            print(f"❌ Error fetching IP geolocation: {str(e)}")
        
        return None


# Singleton instance
external_api_service = ExternalAPIService()
