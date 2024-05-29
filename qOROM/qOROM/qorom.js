





const qorom = function(){

	if( arguments.length === 2 &&
		Array.from( arguments ).every( function( argument ){

		return qorom.isUsefulInteger( argument )

	})){

		return new qorom.Circuit( arguments[ 0 ], arguments[ 1 ])
	}

	return qorom.Circuit.fromText( arguments[ 0 ])
}




Object.assign( qorom, {

	verbosity: 0.5,	
	log: function( verbosityThreshold, ...remainingArguments ){

		if( Q.verbosity >= verbosityThreshold ) console.log( ...remainingArguments )
		return '(log)'
	},
	warn: function(){

		console.warn( ...arguments )
		return '(warn)'
	},
	error: function(){

		console.error( ...arguments )
		return '(error)'
	},
	extractDocumentation: function( f ){

		`
		I wanted a way to document code
		that was cleaner, more legible, and more elegant
		than the bullshit we put up with today.
		Also wanted it to print nicely in the console.
		`

		f = f.toString()
		
		const 
		begin = f.indexOf( '`' ) + 1,
		end   = f.indexOf( '`', begin ),
		lines = f.substring( begin, end ).split( '\n' )


		function countPrefixTabs( text ){

			let count = index = 0
			while( text.charAt( index ++ ) === '\t' ) count ++
			return count
		}


	
		
		let
		tabs  = Number.MAX_SAFE_INTEGER
		
		lines.forEach( function( line ){

			if( line ){
				
				const lineTabs = countPrefixTabs( line )
				if( tabs > lineTabs ) tabs = lineTabs
			}
		})
		lines.forEach( function( line, i ){

			if( line.trim() === '' ) line = '\n\n'
			lines[ i ] = line.substring( tabs ).replace( / {2}$/, '\n' )
		})
		return lines.join( '' )
	},
	help: function( f ){

		if( f === undefined ) f = Q
		return Q.extractDocumentation( f )
	},
	constants: {},
	createConstant: function( key, value ){

		//Object.freeze( value )
		this[ key ] = value
		// Object.defineProperty( this, key, {

		// 	value,
		// 	writable: false
		// })
		// Object.defineProperty( this.constants, key, {

		// 	value,
		// 	writable: false
		// })
		this.constants[ key ] = this[ key ]
		Object.freeze( this[ key ])
	},
	createConstants: function(){

		if( arguments.length % 2 !== 0 ){

			return Q.error( 'Q attempted to create constants with invalid (KEY, VALUE) pairs.' )
		}
		for( let i = 0; i < arguments.length; i += 2 ){

			this.createConstant( arguments[ i ], arguments[ i + 1 ])
		}
	},




	isUsefulNumber: function( n ){

		return isNaN( n ) === false && 
			( typeof n === 'number' || n instanceof Number ) &&
			n !==  Infinity &&
			n !== -Infinity
	},
	isUsefulInteger: function( n ){

		return Q.isUsefulNumber( n ) && Number.isInteger( n )
	},
	loop: function(){},




	hypotenuse: function( x, y ){
		
		let
		a = Math.abs( x ),
		b = Math.abs( y )

		if( a < 2048 && b < 2048 ){
			
			return Math.sqrt( a * a + b * b )
		}
		if( a < b ){
		
			a = b
			b = x / y
		} 
		else b = y / x
		return a * Math.sqrt( 1 + b * b )
	},
	logHypotenuse: function( x, y ){

		const
		a = Math.abs( x ),
		b = Math.abs( y )

		if( x === 0 ) return Math.log( b )
		if( y === 0 ) return Math.log( a )
		if( a < 2048 && b < 2048 ){
		
			return Math.log( x * x + y * y ) / 2
		}
		return Math.log( x / Math.cos( Math.atan2( y, x )))
	},
	hyperbolicSine: function( n ){

		return ( Math.exp( n ) - Math.exp( -n )) / 2
	},
	hyperbolicCosine: function( n ){

		return ( Math.exp( n ) + Math.exp( -n )) / 2
	},
	round: function( n, d ){

		if( typeof d !== 'number' ) d = 0
		const f = Math.pow( 10, d )
		return Math.round( n * f ) / f
	},
	toTitleCase: function( text ){

		text = text.replace( /_/g, ' ' )
		return text.toLowerCase().split( ' ' ).map( function( word ){
		
			return word.replace( word[ 0 ], word[ 0 ].toUpperCase() )
		
		}).join(' ')
	},
	centerText: function( text, length, filler ){

		if( length > text.length ){
			
			if( typeof filler !== 'string' ) filler = ' '

			const 
			padLengthLeft  = Math.floor(( length - text.length ) / 2 ),
			padLengthRight = length - text.length - padLengthLeft

			return text
				.padStart( padLengthLeft + text.length, filler )
				.padEnd( length, filler )
		}
		else return text
	},








	namesIndex: 0,
	shuffledNames: [],
	shuffleNames$: function(){

		let m = []
		for( let c = 0; c < Q.COLORS.length; c ++ ){

			for( let a = 0; a < Q.ANIMALS.length; a ++ ){

				m.push([ c, a, Math.random() ])
			}
		}		
		Q.shuffledNames = m.sort( function( a, b ){

			return a[ 2 ] - b[ 2 ]
		})
	},
	getRandomName$: function(){

		if( Q.shuffledNames.length === 0 ) Q.shuffleNames$()	
		
		const 
		pair = Q.shuffledNames[ Q.namesIndex ],
		name = Q.COLORS[ pair[ 0 ]] +' '+ Q.ANIMALS[ pair[ 1 ]]
		
		Q.namesIndex = ( Q.namesIndex + 1 ) % Q.shuffledNames.length
		return name
	},
	hueToColorName: function( hue ){

		hue = hue % 360
		hue = Math.floor( hue / 10 )
		return Q.COLORS[ hue ]
	},
	colorIndexToHue: function( i ){

		return i * 10
	}
})


