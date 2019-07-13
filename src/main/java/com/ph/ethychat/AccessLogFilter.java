package com.ph.ethychat;

import java.io.IOException;
import java.util.logging.Logger;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class AccessLogFilter implements Filter {

	private ServletContext context;
	
	private static final Logger log = Logger.getLogger(AccessLogFilter.class.getName());

	public void init(FilterConfig fConfig) throws ServletException {
		this.context = fConfig.getServletContext();
		this.context.log("AccessFilter initialized");
	}
	
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {

		HttpServletRequest req = (HttpServletRequest) request;
		//HttpServletResponse resp = (HttpServletResponse) response;

		log.info("Referer: " + req.getHeader("Referer"));
		log.info("Country: " + req.getHeader("X-AppEngine-Country"));
		log.info("Region: " + req.getHeader("X-AppEngine-Region"));
		log.info("City: " + req.getHeader("X-AppEngine-City"));
		log.info("CityLatLong: " + req.getHeader("X-AppEngine-CityLatLong"));

		chain.doFilter(request, response);			
	}

	public void destroy() {
		this.context.log("AccessFilter destroyed");
	}
}
