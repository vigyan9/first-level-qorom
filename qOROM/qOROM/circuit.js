Circuit = function( bandwidth, timewidth ){

	this.index = Circuit.index ++

	if( !isUsefulInteger( bandwidth )) bandwidth = 3
	this.bandwidth = bandwidth

	if( !isUsefulInteger( timewidth )) timewidth = 5
	this.timewidth = timewidth

	this.qubits = new Array( bandwidth ).fill( Q.Qubit.HORIZONTAL )
    this.operations = []
    this.needsEvaluation = true

	this.results = []
	this.matrix  = null
}




Object.assign(Circuit, {

	index: 0,
	// help: function(){ return help( this )},
	constants: {},
	createConstant:  createConstant,
	createConstants: createConstants,


	fromText: function( text ){

		if( text === undefined ) return new Circuit()

		if( text.raw !== undefined ) text = ''+text.raw		
		return Circuit.fromTableTransposed( 
			text
			.trim()
			.split( /\r?\n/ )
			.filter( function( item ){ return item.length })
			.map( function( item, r ){
				return item
				.trim()
				.split( /[-+\s+=+]/ )
				.filter( function( item ){ return item.length })
				.map( function( item, m ){
					const matches = item.match( /(^\w+)(\.(\w+))*(#(\d+))*/ )
					return {
						gateSymbol:        matches[ 1 ],
						operationMomentId: matches[ 3 ],
						mappingIndex:     +matches[ 5 ]
					}
				})
			})
		)
	},
	
	fromTableTransposed: function( table ){

		const
		bandwidth = table.length,
		timewidth = table.reduce( function( max, moments ){

			return Math.max( max, moments.length )
		
		}, 0 ),
		circuit = new Q.Circuit( bandwidth, timewidth )
		
		circuit.bandwidth = bandwidth
		circuit.timewidth = timewidth
		for( let r = 0; r < bandwidth; r ++ ){

			const registerIndex = r + 1
			for( let m = 0; m < timewidth; m ++ ){

				const 
				momentIndex = m + 1,
				operation = table[ r ][ m ]

				let siblingHasBeenFound = false
				for( let s = 0; s < r; s ++ ){

					const sibling = table[ s ][ m ]
					if( operation.gateSymbol === sibling.gateSymbol &&
						operation.operationMomentId === sibling.operationMomentId &&
						Q.isUsefulInteger( operation.mappingIndex ) &&
						Q.isUsefulInteger( sibling.mappingIndex ) &&
						operation.mappingIndex !== sibling.mappingIndex ){


						//  We’ve found a sibling !

						const operationsIndex = circuit.operations.findIndex( function( operation ){

							return (

								operation.momentIndex === momentIndex &&
								operation.registerIndices.includes( s + 1 )
							)
						})
						// console.log( 'operationsIndex?', operationsIndex )
						circuit.operations[ operationsIndex ].registerIndices[ operation.mappingIndex ] = registerIndex
						circuit.operations[ operationsIndex ].isControlled = operation.gateSymbol != '*'//  Q.Gate.SWAP.
						siblingHasBeenFound = true
					}
				}
				if( siblingHasBeenFound === false && operation.gateSymbol !== 'I' ){

					const 
					gate = Q.Gate.findBySymbol( operation.gateSymbol ),
					registerIndices = []					

					if( Q.isUsefulInteger( operation.mappingIndex )){
					
						registerIndices[ operation.mappingIndex ] = registerIndex
					}
					else registerIndices[ 0 ] = registerIndex					
					circuit.operations.push({

						gate,
						momentIndex,
						registerIndices,
						isControlled: false,
						operationMomentId: operation.operationMomentId
					})
				}
			}
		}
		circuit.sort$()
		return circuit
	},




	controlled: function( U ){
		

		//  we should really just replace this with a nice Matrix.copy({}) command!!!!

		// console.log( 'U?', U )

		const 
		size   = U.getWidth(),
		result = Q.Matrix.createIdentity( size * 2 )

		// console.log( 'U', U.toTsv() )
		// console.log( 'size', size )
		// console.log( 'result', result.toTsv() )
		
		for( let x = 0; x < size; x ++ ){
			
			for( let y = 0; y < size; y ++ ){
				
				const v = U.read( x, y )
				// console.log( `value at ${x}, ${y}`, v )
				result.write$( x + size, y + size, v )
			}
		}
		return result
	},

	expandMatrix: function( circuitBandwidth, U, qubitIndices ){

		const _qubits = []
		const n = Math.pow( 2, circuitBandwidth )
		for( let i = 0; i < qubitIndices.length; i ++ ){
			qubitIndices[ i ] = ( circuitBandwidth - 0 ) - qubitIndices[ i ]
		}

		qubitIndices.reverse()
		for( let i = 0; i < circuitBandwidth; i ++ ){
			
			if( qubitIndices.indexOf( i ) == -1 ){
				
				_qubits.push( i )
			}
		}
		
		const result = new Matrix.createZero( n )
		

		let i = n
		while( i -- ){
			
			let j = n
			while( j -- ){
				
				let
				bitsEqual = true,
				k = _qubits.length
				
				while( k -- ){
					
					if(( i & ( 1 << _qubits[ k ])) != ( j & ( 1 << _qubits[ k ]))){
						
						bitsEqual = false
						break
					}
				}
				if( bitsEqual ){

					
					let
					istar = 0,
					jstar = 0,
					k = qubitIndices.length
					
					while( k -- ){
						
						const q = qubitIndices[ k ]
						istar |= (( i & ( 1 << q )) >> q ) << k
						jstar |= (( j & ( 1 << q )) >> q ) << k
					}
					
					result.write$( i, j, U.read( istar, jstar ))
				}
			}
		}
		return result
	},




	evaluate: function( circuit ){
		window.dispatchEvent( new CustomEvent( 

			'Q.Circuit.evaluate began', { 

				detail: { circuit }
			}
		))

		circuit.sort$()

		const state = new Matrix( 1, Math.pow( 2, circuit.bandwidth ))
		state.write$( 0, 0, 1 )
		const operationsTotal = circuit.operations.length
		let operationsCompleted = 0
		let matrix = circuit.operations.reduce( function( state, operation, i ){



			let U
			if( operation.registerIndices.length < Infinity ){
			
				if( operation.isControlled ){
				}
				U = operation.gate.matrix
			} 
			else {
			
			}			

			for( let j = 0; j < operation.registerIndices.length - 1; j ++ ){
			
				U = Q.Circuit.controlled( U )
			}

			const registerIndices = operation.registerIndices.slice()


			state = Q.Circuit.expandMatrix( 

				circuit.bandwidth, 
				U, 
				registerIndices

			).multiply( state )




			operationsCompleted ++
			const progress = operationsCompleted / operationsTotal


			window.dispatchEvent( new CustomEvent( 'Q.Circuit.evaluate progressed', { detail: {

				circuit,
				progress,
				operationsCompleted,
				operationsTotal,
				momentIndex: operation.momentIndex,
				registerIndices: operation.registerIndices,
				gate: operation.gate.name,
				state

			}}))
			

			return state
			
		}, state )
		const outcomes = matrix.rows.reduce( function( outcomes, row, i ){
			outcomes.push({
				state: '|'+ parseInt( i, 10 ).toString( 2 ).padStart( circuit.bandwidth, '0' ) +'⟩',
				probability: Math.pow( row[ 0 ].absolute(), 2 )
			})
			return outcomes
		
		}, [] )



		circuit.needsEvaluation = false
		circuit.matrix = matrix
		circuit.results = outcomes



		window.dispatchEvent( new CustomEvent( 'Q.Circuit.evaluate completed', { detail: {
			circuit,
			results: outcomes
		}}))
		return matrix
	}
})







Object.assign(Circuit.prototype, {

	clone: function(){

		const 
		original = this,
		clone = original.copy()

		clone.qubits  = original.qubits.slice()
		clone.results = original.results.slice()
		clone.needsEvaluation = original.needsEvaluation
		
		return clone
	},
	evaluate$: function(){

		Q.Circuit.evaluate( this )
		return this
	},
	report$: function( length ){

		if( this.needsEvaluation ) this.evaluate$()
		if( !Q.isUsefulInteger( length )) length = 20
		
		const 
		circuit = this,
		text = this.results.reduce( function( text, outcome, i ){

			const
			probabilityPositive = Math.round( outcome.probability * length ),
			probabilityNegative = length - probabilityPositive

			return text +'\n'
				+ ( i + 1 ).toString().padStart( Math.ceil( Math.log10( Math.pow( 2, circuit.qubits.length ))), ' ' ) +'  '
				+ outcome.state +'  '
				+ ''.padStart( probabilityPositive, '' )
				+ ''.padStart( probabilityNegative, '' )
				+ Q.round( Math.round( 100 * outcome.probability ), 8 ).toString().padStart( 4, ' ' ) +'% chance'

		}, '' ) + '\n'
		return text
	},
	try$: function(){

		if( this.needsEvaluation ) this.evaluate$()
		const outcomesStacked = new Array( this.results.length )
		this.results.reduce( function( sum, outcome, i ){

			sum += outcome.probability
			outcomesStacked[ i ] = sum
			return sum
		}, 0 )
		
		const 
		randomNumber = Math.random(),
		randomIndex  = outcomesStacked.findIndex( function( index ){

			return randomNumber <= index
		})
		
		return randomIndex
	},

	sort$: function(){
		this.operations.sort( function( a, b ){

			if( a.momentIndex === b.momentIndex ){
				return Math.min( ...a.registerIndices ) - Math.min( b.registerIndices )
			}
			else {

				return a.momentIndex - b.momentIndex
			}
		})
		return this
	},
	
	toTable: function(){

		const 
		table = new Array( this.timewidth ),
		circuit = this


		table.timewidth = this.timewidth

		table.bandwidth = this.bandwidth
		
		table.fill( 0 ).forEach( function( element, index, array ){

			const operations = new Array( circuit.bandwidth )
			operations.fill( 0 ).forEach( function( element, index, array ){

				array[ index ] = {

					symbol:   'I',
					symbolDisplay: 'I',
					name:    'Identity',
					nameCss: 'identity',
					gateInputIndex: 0,
					bandwidth: 0,
					thisGateAmongMultiQubitGatesIndex: 0,
					aSiblingIsAbove: false,
					aSiblingIsBelow: false
				}
			})
			array[ index ] = operations
		})
		let 
		momentIndex = 1,
		multiRegisterOperationIndex = 0,
		gateTypesUsedThisMoment = {}

		this.operations.forEach( function( operation, operationIndex, operations ){

			if( momentIndex !== operation.momentIndex ){

				table[ momentIndex ].gateTypesUsedThisMoment = gateTypesUsedThisMoment
				momentIndex = operation.momentIndex
				multiRegisterOperationIndex = 0
				gateTypesUsedThisMoment = {}
			}
			if( operation.registerIndices.length > 1 ){

				table[ momentIndex - 1 ].multiRegisterOperationIndex = multiRegisterOperationIndex
				multiRegisterOperationIndex ++
			}
			if( gateTypesUsedThisMoment[ operation.gate.symbol ] === undefined ){

				gateTypesUsedThisMoment[ operation.gate.symbol ] = 1
			}
			else gateTypesUsedThisMoment[ operation.gate.symbol ] ++

			let nameCss = operation.gate.name.toLowerCase().replace( /\s+/g, '-' )

			
			operation.registerIndices.forEach( function( registerIndex, indexAmongSiblings ){

				let isMultiRegisterOperation = false
				if( operation.registerIndices.length > 1 ){

					isMultiRegisterOperation = true
					if(	indexAmongSiblings === operation.registerIndices.length - 1 ){

						nameCss = 'target'
					}
					else {

						nameCss = 'control'
					}

					

				}
				table[ operation.momentIndex - 1 ][ registerIndex - 1 ] = {

					symbol:        operation.gate.symbol,
					symbolDisplay: operation.gate.symbol,
					name:         operation.gate.name,
					nameCss,
					operationIndex,
					momentIndex: operation.momentIndex,
					registerIndex,
					isMultiRegisterOperation,
					multiRegisterOperationIndex,
					gatesOfThisTypeNow: gateTypesUsedThisMoment[ operation.gate.symbol ],
					indexAmongSiblings,
					siblingExistsAbove: Math.min( ...operation.registerIndices ) < registerIndex,
					siblingExistsBelow: Math.max( ...operation.registerIndices ) > registerIndex
				}
			})

				
				table[ momentIndex - 1 ].gateTypesUsedThisMoment = gateTypesUsedThisMoment
		})











		table.forEach( function( moment, m ){

			moment.forEach( function( operation, o ){

				if( operation.isMultiRegisterOperation ){

					if( moment.gateTypesUsedThisMoment[ operation.symbol ] > 1 ){

						operation.symbolDisplay = operation.symbol +'.'+ ( operation.gatesOfThisTypeNow - 1 )
					}
					operation.symbolDisplay += '#'+ operation.indexAmongSiblings
				}
			})
		})


		
		table.forEach( function( moment ){

			const maximumWidth = moment.reduce( function( maximumWidth, operation ){

				return Math.max( maximumWidth, operation.symbolDisplay.length )
			
			}, 1 )
			moment.maximumCharacterWidth = maximumWidth
		})


		
		
		table.maximumCharacterWidth = table.reduce( function( maximumWidth, moment ){

			return Math.max( maximumWidth, moment.maximumCharacterWidth )
		
		}, 1 )


		
		return table
	},
	toText: function( makeAllMomentsEqualWidth ){

		`
		Create a text representation of this circuit
		using only common characters,
		ie. no fancy box-drawing characters.
		This is the complement of Circuit.fromText()
		`

		const 
		table  = this.toTable(),
		output = new Array( table.bandwidth ).fill( '' )

		for( let x = 0; x < table.timewidth; x ++ ){

			for( let y = 0; y < table.bandwidth; y ++ ){

				let cellString = table[ x ][ y ].symbolDisplay.padEnd( table[ x ].maximumCharacterWidth, '-' )
				if( makeAllMomentsEqualWidth && x < table.timewidth - 1 ){

					cellString = table[ x ][ y ].symbolDisplay.padEnd( table.maximumCharacterWidth, '-' )
				}
				if( x > 0 ) cellString = '-'+ cellString
				output[ y ] += cellString
			}
		}
		return '\n'+ output.join( '\n' )
		// return output.join( '\n' )
	},
	toDiagram: function( makeAllMomentsEqualWidth ){

		`
		Create a text representation of this circuit
		using fancy box-drawing characters.
		`

		const 
		scope  = this,
		table  = this.toTable(),
		output = new Array( table.bandwidth * 3 + 1 ).fill( '' )

		output[ 0 ] = '        '
		scope.qubits.forEach( function( qubit, q ){

			const y3 = q * 3
			output[ y3 + 1 ] += '        '
			output[ y3 + 2 ] += 'r'+ ( q + 1 ) +'  |'+ qubit.beta.toText().trim() +'⟩─'
			output[ y3 + 3 ] += '        '
		})
		for( let x = 0; x < table.timewidth; x ++ ){

			const padToLength = makeAllMomentsEqualWidth
				? table.maximumCharacterWidth
				: table[ x ].maximumCharacterWidth

			output[ 0 ] += Q.centerText( 'm'+ ( x + 1 ), padToLength + 4 )
			for( let y = 0; y < table.bandwidth; y ++ ){

				let 
				operation = table[ x ][ y ],
				first  = '',
				second = '',
				third  = ''

				if( operation.symbol === 'I' ){

					first  += '  '
					second += '──'
					third  += '  '
					
					first  += ' '.padEnd( padToLength )
					second += Q.centerText( '○', padToLength, '─' )
					third  += ' '.padEnd( padToLength )

					first  += '  '
					if( x < table.timewidth - 1 ) second += '──'
					else second += '  '
					third  += '  '
				}
				else {

					if( operation.isMultiRegisterOperation ){

						first  += '╭─'
						third  += '╰─'
					}
					else {
					
						first  += '┌─'
						third  += '└─'
					}
					second += '┤ '
					
					first  += '─'.padEnd( padToLength, '─' )
					second += Q.centerText( operation.symbolDisplay, padToLength )
					third  += '─'.padEnd( padToLength, '─' )


					if( operation.isMultiRegisterOperation ){

						first  += '─╮'
						third  += '─╯'
					}
					else {

						first  += '─┐'
						third  += '─┘'
					}
					second += x < table.timewidth - 1 ? ' ├' : ' │'

					if( operation.isMultiRegisterOperation ){

						let n = ( operation.multiRegisterOperationIndex * 2 ) % ( table[ x ].maximumCharacterWidth + 1 ) + 1
						if( operation.siblingExistsAbove ){						

							first = first.substring( 0, n ) +'┴'+ first.substring( n + 1 )
						}
						if( operation.siblingExistsBelow ){

							third = third.substring( 0, n ) +'┬'+ third.substring( n + 1 )
						}					
					}
				}
				const y3 = y * 3				
				output[ y3 + 1 ] += first
				output[ y3 + 2 ] += second
				output[ y3 + 3 ] += third
			}
		}
		return '\n'+ output.join( '\n' )
	},




	//  Oh yes my friends... WebGL is coming!

	toShader: function(){

	},
	toGoogleCirq: function(){
/*


cirq.GridQubit(4,5)

https://cirq.readthedocs.io/en/stable/tutorial.html

*/
		const header = `import cirq`

		return headers
	},
	toAmazonBraket: function(){

		const header = `import boto3
from braket.aws import AwsQuantumSimulator, AwsQuantumSimulatorArns
from braket.circuits import Circuit

aws_account_id = boto3.client("sts").get_caller_identity()["Account"]
device = AwsQuantumSimulator(AwsQuantumSimulatorArns.QS1)
s3_folder = (f"braket-output-{aws_account_id}", "folder-name")

`
		//`qjs_circuit = Circuit().h(0).cnot(0,1)`
		let circuit = this.operations.reduce( function( string, operation ){

			let awsGate = operation.gate.AmazonBraketName !== undefined ?
				operation.gate.AmazonBraketName :
				operation.gate.symbol.substr( 0, 1 ).toLowerCase()

			if( operation.gate.symbol === 'X' && 
				operation.registerIndices.length > 1 ){

				awsGate = 'cnot'
			}
			if( operation.gate.symbol === '*' ){

				awsGate = 'i'
			}
			
			return string +'.'+ awsGate +'(' + 
				operation.registerIndices.reduce( function( string, registerIndex, r ){

					return string + (( r > 0 ) ? ',' : '' ) + ( registerIndex - 1 )

				}, '' ) + ')'

		}, 'qjs_circuit = Circuit()' )
		if( this.operations.length === 0 ) circuit +=  '.i(0)'//  Quick fix to avoid an error here!

		const footer = `\n\ntask = device.run(qjs_circuit, s3_folder, shots=100)
print(task.result().measurement_counts)`
		return header + circuit + footer
	},
	toLatex: function(){


		return '\\Qcircuit @C=1.0em @R=0.7em {\n' +
		this.toTable()
		.reduce( function( array, moment, m ){

			moment.forEach( function( operation, o, operations ){

				let command = 'qw'
				if( operation.symbol !== 'I' ){

					if( operation.isMultiRegisterOperation ){

						if( operation.indexAmongSiblings === 0 ){

							if( operation.symbol === 'X' ) command = 'targ'
							else command = operation.symbol.toLowerCase()
						}
						else if( operation.indexAmongSiblings > 0 ) command = 'ctrl{?}'
					}
					else command = operation.symbol.toLowerCase()
				}
				operations[ o ].latexCommand = command
			})
			const maximumCharacterWidth = moment.reduce( function( maximumCharacterWidth, operation ){

				return Math.max( maximumCharacterWidth, operation.latexCommand.length )
			
			}, 0 )
			moment.forEach( function( operation, o ){

				array[ o ] += '& \\'+ operation.latexCommand.padEnd( maximumCharacterWidth ) +'  '
			})
			return array

		}, new Array( this.bandwidth ).fill( '\n\t' ))
		.join( '\\\\' ) + 
		'\n}'
	},






	  

	get: function( momentIndex, registerIndex ){

		return this.operations.find( function( op ){

			return op.momentIndex === momentIndex && 
				op.registerIndices.includes( registerIndex )
		})
	},
	clear$: function( momentIndex, registerIndices ){

		const circuit = this


		//  Validate our arguments.
		
		if( arguments.length !== 2 ) 
			Q.warn( `Q.Circuit.clear$ expected 2 arguments but received ${ arguments.length }.` )
		if( Q.isUsefulInteger( momentIndex ) !== true )
			return Q.error( `Q.Circuit attempted to clear an input on Circuit #${ circuit.index } using an invalid moment index:`, momentIndex )
		if( Q.isUsefulInteger( registerIndices )) registerIndices = [ registerIndices ]
		if( registerIndices instanceof Array !== true )
			return Q.error( `Q.Circuit attempted to clear an input on Circuit #${ circuit.index } using an invalid register indices array:`, registerIndices )


		

		const foundOperations = circuit.operations.reduce( function( filtered, operation, o ){

			if( operation.momentIndex === momentIndex && 
				operation.registerIndices.some( function( registerIndex ){

					return registerIndices.includes( registerIndex )
				})
			) filtered.push({

				index: o,
				momentIndex: operation.momentIndex,
				registerIndices: operation.registerIndices,
				gate: operation.gate
			})
			return filtered

		}, [] )


	
		foundOperations.reduce( function( deletionsSoFar, operation ){

			circuit.operations.splice( operation.index - deletionsSoFar, 1 )
			return deletionsSoFar + 1

		}, 0 )


		
				
		this.sort$()


	
		if( foundOperations.length ){

			this.history.record$({

				redo: {
					
					name: 'clear$',
					func:  circuit.clear$,				
					args:  Array.from( arguments )
				},
				undo: foundOperations.reduce( function( undos, operation ){

					undos.push({

						name: 'set$',
						func: circuit.set$,
						args: [

							operation.gate,
							operation.momentIndex,
							operation.registerIndices
						]
					})
					return undos
				
				}, [] )
			})


			
			foundOperations.forEach( function( operation ){

				window.dispatchEvent( new CustomEvent( 

					'Q.Circuit.clear$', { detail: { 

						circuit,
						momentIndex,
						registerIndices: operation.registerIndices
					}}
				))
			})
		}


		return circuit
	},
	

	setProperty$: function( key, value ){

		this[ key ] = value
		return this
	},
	setName$: function( name ){

		if( typeof name === 'function' ) name = name()
		return this.setProperty$( 'name', name )
	},


	set$: function( gate, momentIndex, registerIndices ){

		const circuit = this


		
		if( typeof gate === 'string' ) gate = Q.Gate.findBySymbol( gate )
		if( gate instanceof Q.Gate !== true ) return Q.error( `Q.Circuit attempted to add a gate to circuit #${ this.index } at moment #${ momentIndex } that is not a gate:`, gate )


		
		if( Q.isUsefulNumber( momentIndex ) !== true ||
			Number.isInteger( momentIndex ) !== true ||
			momentIndex < 1 || momentIndex > this.timewidth ){

			return Q.error( `Q.Circuit attempted to add a gate to circuit #${ this.index } at a moment index that is not valid:`, momentIndex )
		}


		

		if( typeof registerIndices === 'number' ) registerIndices = [ registerIndices ]
		if( registerIndices instanceof Array !== true ) return Q.error( `Q.Circuit attempted to add a gate to circuit #${ this.index } at moment #${ momentIndex } with an invalid register indices array:`, registerIndices )
		if( registerIndices.length === 0 ) return Q.error( `Q.Circuit attempted to add a gate to circuit #${ this.index } at moment #${ momentIndex } with an empty register indices array:`, registerIndices )
		if( registerIndices.reduce( function( accumulator, registerIndex ){

		
			return (

				accumulator && 
				registerIndex > 0 && 
				registerIndex <= circuit.bandwidth
			)

		}, false )){

			return Q.warn( `Q.Circuit attempted to add a gate to circuit #${ this.index } at moment #${ momentIndex } with some out of range qubit indices:`, registerIndices )
		}


		const
		isRedundant = !!circuit.operations.find( function( operation ){

			return (

				momentIndex === operation.momentIndex &&
				gate === operation.gate &&
				registerIndices.length === operation.registerIndices.length &&
				registerIndices.every( val => operation.registerIndices.includes( val ))
			)
		})


	

		if( isRedundant !== true ){


			
			this.clear$( momentIndex, registerIndices )
			

			
			const 
			isControlled = registerIndices.length > 1 && gate !== Q.Gate.SWAP,
			operation = {

				gate,
				momentIndex,
				registerIndices,
				isControlled
			}
			this.operations.push( operation )

			
			
			this.sort$()


			

			this.history.record$({

				redo: {
					
					name: 'set$',
					func: circuit.set$,
					args: Array.from( arguments )
				},
				undo: [{

					name: 'clear$',
					func: circuit.clear$,
					args: [ momentIndex, registerIndices ]
				}]
			})

			
			

			window.dispatchEvent( new CustomEvent( 

				'Q.Circuit.set$', { detail: { 

					circuit,
					operation
				}}
			))
		}
		return circuit
	},




	determineRanges: function( options ){

		if( options === undefined ) options = {}
		let {

			qubitFirstIndex,
			qubitRange,
			qubitLastIndex,
			momentFirstIndex,
			momentRange,
			momentLastIndex

		} = options

		if( typeof qubitFirstIndex !== 'number' ) qubitFirstIndex = 0
		if( typeof qubitLastIndex  !== 'number' && typeof qubitRange !== 'number' ) qubitLastIndex = this.bandwidth
		if( typeof qubitLastIndex  !== 'number' && typeof qubitRange === 'number' ) qubitLastIndex = qubitFirstIndex + qubitRange
		else if( typeof qubitLastIndex === 'number' && typeof qubitRange !== 'number' ) qubitRange = qubitLastIndex - qubitFirstIndex
		else return Q.error( `Q.Circuit attempted to copy a circuit but could not understand what qubits to copy.` )

		if( typeof momentFirstIndex !== 'number' ) momentFirstIndex = 0
		if( typeof momentLastIndex  !== 'number' && typeof momentRange !== 'number' ) momentLastIndex = this.timewidth
		if( typeof momentLastIndex  !== 'number' && typeof momentRange === 'number' ) momentLastIndex = momentFirstIndex + momentRange
		else if( typeof momentLastIndex === 'number' && typeof momentRange !== 'number' ) momentRange = momentLastIndex - momentFirstIndex
		else return Q.error( `Q.Circuit attempted to copy a circuit but could not understand what moments to copy.` )

		Q.log( 0.8, 
		
			'\nQ.Circuit copy operation:',
			'\n\n  qubitFirstIndex', qubitFirstIndex,
			'\n  qubitLastIndex ', qubitLastIndex,
			'\n  qubitRange     ', qubitRange,
			'\n\n  momentFirstIndex', momentFirstIndex,
			'\n  momentLastIndex ', momentLastIndex,
			'\n  momentRange     ', momentRange,
			'\n\n'
		)

		return {

			qubitFirstIndex,
			qubitRange,
			qubitLastIndex,
			momentFirstIndex,
			momentRange,
			momentLastIndex
		}
	},


	copy: function( options, isACutOperation ){

		const original = this
		let {

			registerFirstIndex,
			registerRange,
			registerLastIndex,
			momentFirstIndex,
			momentRange,
			momentLastIndex

		} = this.determineRanges( options )

		const copy = new Q.Circuit( registerRange, momentRange )

		original.operations
		.filter( function( operation ){

			return ( operation.registerIndices.every( function( registerIndex ){

				return (

					operation.momentIndex   >= momentFirstIndex &&
					operation.momentIndex   <  momentLastIndex &&
					operation.registerIndex >= registerFirstIndex && 
					operation.registerIndex <  registerLastIndex
				)
			}))
		})			
		.forEach( function( operation ){

			const adjustedRegisterIndices = operation.registerIndices.map( function( registerIndex ){

				return registerIndex - registerFirstIndex
			})
			copy.set$(

				operation.gate, 
				1 + m - momentFirstIndex, 
				adjustedRegisterIndices
			)
		})





		
		if( isACutOperation === true ){

			
		}
		return copy
	},
	cut$: function( options ){

		return this.copy( options, true )
	},







	spliceCut$: function( options ){

		let {

			qubitFirstIndex,
			qubitRange,
			qubitLastIndex,
			momentFirstIndex,
			momentRange,
			momentLastIndex

		} = this.determineRanges( options )


		

		if( qubitRange  !== this.bandwidth &&
			momentRange !== this.timewidth ){

			return Q.error( `Q.Circuit attempted to splice circuit #${this.index} by an area that did not include all qubits _or_ all moments.` )
		}


		if( qubitRange === this.bandwidth ){


			
			
			this.moments = this.moments.reduce( function( accumulator, moment, m ){

				if( m < momentFirstIndex - 1 || m >= momentLastIndex - 1 ) accumulator.push( moment )
				return accumulator
			
			}, [])
			this.timewidth -= momentRange

			
		}


		
	
		if( momentRange === this.timewidth ){


			

			this.inputs.splice( qubitFirstIndex, qubitRange )
			

			this.moments = this.moments.map( function( operations ){

				
			
				
				return operations.reduce( function( accumulator, operation ){

					if( operation.qubitIndices.every( function( index ){

						return index < qubitFirstIndex || index >= qubitLastIndex
					
					})) accumulator.push( operation )
					return accumulator
				
				}, [])
				.map( function( operation ){

					operation.qubitIndices = operation.qubitIndices.map( function( index ){

						return index >= qubitLastIndex ? index - qubitRange : index
					})
					return operation
				})
			})
			this.bandwidth -= qubitRange
		}
		


		this.removeHangingOperations$()
		this.fillEmptyOperations$()
		

		return this
	},
	splicePaste$: function(){


	},
	




	


	paste$: function( other, atMoment = 0, atQubit = 0, shouldClean = true ){

		const scope = this
		this.timewidth = Math.max( this.timewidth, atMoment + other.timewidth )
		this.bandwidth = Math.max( this.bandwidth, atQubit  + other.bandwidth )
		this.ensureMomentsAreReady$()
		this.fillEmptyOperations$()
		other.moments.forEach( function( moment, m ){

			moment.forEach( function( operation ){

				//console.log( 'past over w this:', m + atMoment, operation )

				scope.set$(

					operation.gate,
					m + atMoment + 1,
					operation.qubitIndices.map( function( qubitIndex ){

						return qubitIndex + atQubit
					})
				)
			})
		})
		if( shouldClean ) this.removeHangingOperations$()
		this.fillEmptyOperations$()
		return this
	},
	pasteInsert$: function( other, atMoment, atQubit ){

		// if( other.alphandwidth !== this.bandwidth && 
		// 	other.timewidth !== this.timewidth ) return Q.error( 'Q.Circuit attempted to pasteInsert Circuit A', other, 'in to circuit B', this, 'but neither their bandwidth or timewidth matches.' )

		


		if( shouldClean ) this.removeHangingOperations$()
		this.fillEmptyOperations$()		
		return this

	},
	expand$: function(){

		//   expand either bandwidth or timewidth, fill w  identity


		this.fillEmptyOperations$()
		return thiis
	},







	trim$: function( options ){

		`
		Edit this circuit by trimming off moments, qubits, or both.
		We could have implemented trim$() as a wrapper around copy$(),
		similar to how cut$ is a wrapper around copy$().
		But this operates on the existing circuit 
		instead of returning a new one and returning that.
		`

		let {

			qubitFirstIndex,
			qubitRange,
			qubitLastIndex,
			momentFirstIndex,
			momentRange,
			momentLastIndex

		} = this.determineRanges( options )


	

		this.moments = this.moments.slice( momentFirstIndex, momentLastIndex )
		this.timewidth = momentRange


		

		this.inputs = this.inputs.slice( qubitFirstIndex, qubitLastIndex )
		this.bandwidth = qubitRange

		
		this.removeHangingOperations$()
		this.fillEmptyOperations$()

		return this
	}
})


Object.entries( Q.Gate.constants ).forEach( function( entry ){

	const 
	gateConstantName = entry[ 0 ],
	gate = entry[ 1 ],
	set$ = function( momentIndex, registerIndexOrIndices ){

		this.set$( gate, momentIndex, registerIndexOrIndices )
		return this
	}
	Circuit.prototype[ gateConstantName ] = set$
	Circuit.prototype[ gate.symbol ] = set$
	Circuit.prototype[ gate.symbol.toLowerCase() ] = set$
})

Circuit.createConstants(

	'BELL', Q`

		H  X#0
		I  X#1
	`,	
	
)



